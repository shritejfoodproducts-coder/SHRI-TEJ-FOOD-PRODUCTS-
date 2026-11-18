import type { BagSize, Order, UserProfile } from '../src/types/erp.ts';
import type {
  ErpMutationAction,
  LiveActivityEvent,
  SyncableErpState,
} from './erpSyncTypes.ts';
import { calculateSalesmanOrderCommission } from './commission.ts';

export interface MutationApplyResult {
  nextState: SyncableErpState;
  applied: boolean;
  activityMeta?: {
    category: LiveActivityEvent['category'];
    title: string;
    detail: string;
  };
}

function applySalesmanDeliveryCommission(
  order: Order,
  staffList: UserProfile[]
): Order {
  const salesman = order.salesmanId
    ? staffList.find((s) => s.id === order.salesmanId)
    : undefined;

  if (order.status === 'delivered' && salesman) {
    const commissionAmount = calculateSalesmanOrderCommission(order, salesman);
    return {
      ...order,
      salesmanCommissionAmount: commissionAmount,
      salesmanCommissionType: salesman.commissionType || 'percent',
      salesmanCommissionRate: Number(salesman.commissionRate) || 0,
      commissionCredited: commissionAmount > 0,
    };
  }

  return {
    ...order,
    salesmanCommissionAmount: 0,
    commissionCredited: false,
  };
}

export function applyErpMutation(
  state: SyncableErpState,
  action: ErpMutationAction,
  processedPaymentIds?: Set<string>
): MutationApplyResult {
  const nowIso = new Date().toISOString();

  switch (action.type) {
    case 'order:create': {
      const { order } = action;
      if (state.orders.some((o) => o.id === order.id)) {
        return { nextState: state, applied: false };
      }

      const matchedCustomer = state.customers.find((c) => c.id === order.customerId);
      const effectiveSalesmanId = order.salesmanId || matchedCustomer?.salesmanId;
      const effectiveSalesmanName = order.salesmanName || matchedCustomer?.salesmanName;
      const attributedOrder =
        effectiveSalesmanId || effectiveSalesmanName
          ? {
              ...order,
              salesmanId: effectiveSalesmanId,
              salesmanName: effectiveSalesmanName,
            }
          : order;
      const normalizedOrder = applySalesmanDeliveryCommission(attributedOrder, state.staff);

      const nextOrders = [normalizedOrder, ...state.orders];
      const nextCustomers = state.customers.map((c) => {
        if (c.id === normalizedOrder.customerId) {
          return {
            ...c,
            totalOrders: c.totalOrders + 1,
            totalPurchased: c.totalPurchased + normalizedOrder.totalAmount,
            totalPaid: c.totalPaid + normalizedOrder.paidAmount,
            currentDue: c.currentDue + normalizedOrder.dueAmount,
            lastOrderDate: normalizedOrder.date,
          };
        }
        return c;
      });

      const nextBagStock = state.bagStock.map((b) => {
        const matchedLine = normalizedOrder.items.find(
          (i) => i.productId === b.productId && i.bagSize === b.bagSize
        );
        if (matchedLine) {
          return {
            ...b,
            reservedCount: b.reservedCount + matchedLine.quantity,
          };
        }
        return b;
      });

      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          orders: nextOrders,
          customers: nextCustomers,
          bagStock: nextBagStock,
        },
        applied: true,
        activityMeta: {
          category: 'order',
          title: `नया ऑर्डर: ${normalizedOrder.invoiceNumber}`,
          detail: `${normalizedOrder.customerFirm || normalizedOrder.customerName} • ₹${normalizedOrder.totalAmount.toLocaleString('en-IN')}${normalizedOrder.salesmanName ? ` (${normalizedOrder.salesmanName})` : ''}`,
        },
      };
    }

    case 'order:update': {
      const { updatedOrder, originalOrder } = action;
      const existing = state.orders.find((o) => o.id === updatedOrder.id) || originalOrder;
      if (!state.orders.some((o) => o.id === updatedOrder.id)) {
        return { nextState: state, applied: false };
      }

      const normalizedUpdatedOrder = applySalesmanDeliveryCommission(updatedOrder, state.staff);
      const deltaTotal = normalizedUpdatedOrder.totalAmount - existing.totalAmount;
      const deltaPaid = normalizedUpdatedOrder.paidAmount - existing.paidAmount;
      const deltaDue = normalizedUpdatedOrder.dueAmount - existing.dueAmount;

      const nextOrders = state.orders.map((o) =>
        o.id === normalizedUpdatedOrder.id ? normalizedUpdatedOrder : o
      );

      const nextCustomers = state.customers.map((c) => {
        if (c.id === updatedOrder.customerId) {
          return {
            ...c,
            totalPurchased: Math.max(0, c.totalPurchased + deltaTotal),
            totalPaid: Math.max(0, c.totalPaid + deltaPaid),
            currentDue: Math.max(0, c.currentDue + deltaDue),
          };
        }
        return c;
      });

      let nextBagStock = state.bagStock;
      if (updatedOrder.status !== 'delivered' && updatedOrder.status !== 'cancelled') {
        nextBagStock = state.bagStock.map((b) => {
          const oldItem = existing.items.find(
            (i) => i.productId === b.productId && i.bagSize === b.bagSize
          );
          const newItem = updatedOrder.items.find(
            (i) => i.productId === b.productId && i.bagSize === b.bagSize
          );
          const diff = (newItem ? newItem.quantity : 0) - (oldItem ? oldItem.quantity : 0);
          if (diff !== 0) {
            return {
              ...b,
              reservedCount: Math.max(0, b.reservedCount + diff),
            };
          }
          return b;
        });
      }

      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          orders: nextOrders,
          customers: nextCustomers,
          bagStock: nextBagStock,
        },
        applied: true,
        activityMeta: {
          category: 'order',
          title: `ऑर्डर एडिट: ${updatedOrder.invoiceNumber}`,
          detail: `${updatedOrder.customerFirm || updatedOrder.customerName} • ₹${updatedOrder.totalAmount.toLocaleString('en-IN')}`,
        },
      };
    }

    case 'order:delete': {
      const orderToDelete = state.orders.find((o) => o.id === action.orderId);
      if (!orderToDelete) {
        return { nextState: state, applied: false };
      }

      const nextCustomers = state.customers.map((c) => {
        if (c.id === orderToDelete.customerId) {
          return {
            ...c,
            totalOrders: Math.max(0, c.totalOrders - 1),
            totalPurchased: Math.max(0, c.totalPurchased - orderToDelete.totalAmount),
            totalPaid: Math.max(0, c.totalPaid - orderToDelete.paidAmount),
            currentDue: Math.max(0, c.currentDue - orderToDelete.dueAmount),
          };
        }
        return c;
      });

      let nextBagStock = state.bagStock;
      if (orderToDelete.status !== 'delivered' && orderToDelete.status !== 'cancelled') {
        nextBagStock = state.bagStock.map((b) => {
          const item = orderToDelete.items.find(
            (i) => i.productId === b.productId && i.bagSize === b.bagSize
          );
          if (item) {
            return {
              ...b,
              reservedCount: Math.max(0, b.reservedCount - item.quantity),
            };
          }
          return b;
        });
      }

      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          orders: state.orders.filter((o) => o.id !== action.orderId),
          customers: nextCustomers,
          bagStock: nextBagStock,
        },
        applied: true,
        activityMeta: {
          category: 'order',
          title: `ऑर्डर डिलीट: ${orderToDelete.invoiceNumber}`,
          detail: `${orderToDelete.customerFirm || orderToDelete.customerName}`,
        },
      };
    }

    case 'order:status': {
      const targetOrder = state.orders.find((o) => o.id === action.orderId);
      if (!targetOrder) {
        return { nextState: state, applied: false };
      }
      if (targetOrder.status === action.newStatus) {
        return { nextState: state, applied: false };
      }

      const wasDelivered = targetOrder.status === 'delivered';
      const resolvedDeliveredAt =
        action.newStatus === 'delivered'
          ? action.deliveredAt || new Date().toISOString().slice(0, 16).replace('T', ' ')
          : targetOrder.deliveredAt;

      const nextOrders = state.orders.map((o) => {
        if (o.id === action.orderId) {
          const updated = {
            ...o,
            status: action.newStatus,
            deliveredAt: resolvedDeliveredAt,
          };
          return applySalesmanDeliveryCommission(updated, state.staff);
        }
        return o;
      });
      const finalizedOrder = nextOrders.find((o) => o.id === action.orderId);

      let nextBagStock = state.bagStock;
      if (action.newStatus === 'delivered' && !wasDelivered) {
        nextBagStock = state.bagStock.map((b) => {
          const matched = targetOrder.items.find(
            (i) => i.productId === b.productId && i.bagSize === b.bagSize
          );
          if (matched) {
            return {
              ...b,
              packedCount: Math.max(0, b.packedCount - matched.quantity),
              reservedCount: Math.max(0, b.reservedCount - matched.quantity),
            };
          }
          return b;
        });
      }

      const commNote =
        action.newStatus === 'delivered' &&
        finalizedOrder?.salesmanCommissionAmount &&
        finalizedOrder.salesmanCommissionAmount > 0
          ? ` • सेल्समैन कमीशन +₹${finalizedOrder.salesmanCommissionAmount.toLocaleString('en-IN')}`
          : '';

      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          orders: nextOrders,
          bagStock: nextBagStock,
        },
        applied: true,
        activityMeta: {
          category: 'order',
          title: `ऑर्डर स्टेटस बदला: ${targetOrder.invoiceNumber}`,
          detail: `${targetOrder.customerFirm || targetOrder.customerName} → ${action.newStatus}${commNote}`,
        },
      };
    }

    case 'payment:receive': {
      const { payment } = action;
      if (processedPaymentIds && processedPaymentIds.has(payment.id)) {
        return { nextState: state, applied: false };
      }
      if (processedPaymentIds) {
        processedPaymentIds.add(payment.id);
      }

      const nextCustomers = state.customers.map((c) => {
        if (c.id === payment.customerId) {
          return {
            ...c,
            totalPaid: c.totalPaid + payment.amount,
            currentDue: Math.max(0, c.currentDue - payment.amount),
          };
        }
        return c;
      });

      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          customers: nextCustomers,
        },
        applied: true,
        activityMeta: {
          category: 'payment',
          title: `भुगतान प्राप्त: ₹${payment.amount.toLocaleString('en-IN')}`,
          detail: `${payment.customerName} (${payment.paymentMode.toUpperCase()})`,
        },
      };
    }

    case 'customer:create': {
      if (state.customers.some((c) => c.id === action.customer.id)) {
        return { nextState: state, applied: false };
      }
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          customers: [action.customer, ...state.customers],
        },
        applied: true,
        activityMeta: {
          category: 'customer',
          title: `नया ग्राहक: ${action.customer.firmName || action.customer.name}`,
          detail: `फ़ोन: ${action.customer.phone}${action.customer.salesmanName ? ` • सेल्समैन: ${action.customer.salesmanName}` : ''}`,
        },
      };
    }

    case 'customer:update': {
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          customers: state.customers.map((c) =>
            c.id === action.customer.id ? action.customer : c
          ),
        },
        applied: true,
        activityMeta: {
          category: 'customer',
          title: `ग्राहक अपडेट: ${action.customer.firmName || action.customer.name}`,
          detail: `बकाया: ₹${action.customer.currentDue.toLocaleString('en-IN')}`,
        },
      };
    }

    case 'customer:delete': {
      const cust = state.customers.find((c) => c.id === action.customerId);
      if (!cust) return { nextState: state, applied: false };
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          customers: state.customers.filter((c) => c.id !== action.customerId),
        },
        applied: true,
        activityMeta: {
          category: 'customer',
          title: `ग्राहक हटाया गया`,
          detail: cust.firmName || cust.name,
        },
      };
    }

    case 'production:create': {
      const { batch } = action;
      if (state.production.some((p) => p.id === batch.id)) {
        return { nextState: state, applied: false };
      }

      const wheatUsedQuintals = batch.wheatInputKg / 100;
      const newWheatStock = Math.max(0, state.rawStock.wheatQuintals - wheatUsedQuintals);
      const newEmptyBags = { ...state.rawStock.emptyBags };

      (Object.keys(batch.packedBags) as unknown as BagSize[]).forEach((size) => {
        const used = batch.packedBags[size] || 0;
        newEmptyBags[size] = Math.max(0, (newEmptyBags[size] || 0) - used);
      });

      const nextBagStock = state.bagStock.map((item) => {
        if (item.productId === batch.productId && batch.packedBags[item.bagSize]) {
          const added = batch.packedBags[item.bagSize] || 0;
          return {
            ...item,
            packedCount: item.packedCount + added,
          };
        }
        return item;
      });

      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          production: [batch, ...state.production],
          rawStock: {
            ...state.rawStock,
            wheatQuintals: newWheatStock,
            emptyBags: newEmptyBags,
            lastUpdated: nowIso,
          },
          bagStock: nextBagStock,
        },
        applied: true,
        activityMeta: {
          category: 'production',
          title: `नया पिसाई बैच: ${batch.batchNumber}`,
          detail: `${batch.productName} • गेहूँ ${batch.wheatInputKg} kg → आटा ${batch.attaOutputKg} kg`,
        },
      };
    }

    case 'production:update': {
      const { updatedBatch, originalBatch } = action;
      const existing =
        state.production.find((p) => p.id === updatedBatch.id) || originalBatch;
      if (!state.production.some((p) => p.id === updatedBatch.id)) {
        return { nextState: state, applied: false };
      }

      const deltaWheatQuintals =
        (updatedBatch.wheatInputKg - existing.wheatInputKg) / 100;
      const newWheatStock = Math.max(
        0,
        state.rawStock.wheatQuintals - deltaWheatQuintals
      );
      const newEmptyBags = { ...state.rawStock.emptyBags };

      const allSizes = Array.from(
        new Set([
          ...Object.keys(updatedBatch.packedBags),
          ...Object.keys(existing.packedBags),
        ])
      ) as unknown as BagSize[];

      allSizes.forEach((size) => {
        const origCount = existing.packedBags[size] || 0;
        const newCount = updatedBatch.packedBags[size] || 0;
        const bagDiff = newCount - origCount;
        newEmptyBags[size] = Math.max(0, (newEmptyBags[size] || 0) - bagDiff);
      });

      const nextBagStock = state.bagStock.map((item) => {
        if (item.productId === updatedBatch.productId) {
          const origCount = existing.packedBags[item.bagSize] || 0;
          const newCount = updatedBatch.packedBags[item.bagSize] || 0;
          const bagDiff = newCount - origCount;
          if (bagDiff !== 0) {
            return {
              ...item,
              packedCount: Math.max(0, item.packedCount + bagDiff),
            };
          }
        }
        return item;
      });

      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          production: state.production.map((p) =>
            p.id === updatedBatch.id ? updatedBatch : p
          ),
          rawStock: {
            ...state.rawStock,
            wheatQuintals: newWheatStock,
            emptyBags: newEmptyBags,
            lastUpdated: nowIso,
          },
          bagStock: nextBagStock,
        },
        applied: true,
        activityMeta: {
          category: 'production',
          title: `बैच एडिट: ${updatedBatch.batchNumber}`,
          detail: `गेहूँ ${updatedBatch.wheatInputKg} kg → आटा ${updatedBatch.attaOutputKg} kg`,
        },
      };
    }

    case 'production:delete': {
      const batchToDelete = state.production.find((p) => p.id === action.batchId);
      if (!batchToDelete) return { nextState: state, applied: false };

      const newWheatStock =
        state.rawStock.wheatQuintals + batchToDelete.wheatInputKg / 100;
      const newEmptyBags = { ...state.rawStock.emptyBags };

      (Object.keys(batchToDelete.packedBags) as unknown as BagSize[]).forEach(
        (size) => {
          const used = batchToDelete.packedBags[size] || 0;
          newEmptyBags[size] = (newEmptyBags[size] || 0) + used;
        }
      );

      const nextBagStock = state.bagStock.map((item) => {
        if (
          item.productId === batchToDelete.productId &&
          batchToDelete.packedBags[item.bagSize]
        ) {
          const added = batchToDelete.packedBags[item.bagSize] || 0;
          return {
            ...item,
            packedCount: Math.max(0, item.packedCount - added),
          };
        }
        return item;
      });

      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          production: state.production.filter((p) => p.id !== action.batchId),
          rawStock: {
            ...state.rawStock,
            wheatQuintals: newWheatStock,
            emptyBags: newEmptyBags,
            lastUpdated: nowIso,
          },
          bagStock: nextBagStock,
        },
        applied: true,
        activityMeta: {
          category: 'production',
          title: `बैच हटाया गया: ${batchToDelete.batchNumber}`,
          detail: batchToDelete.productName,
        },
      };
    }

    case 'expense:create': {
      if (state.expenses.some((e) => e.id === action.expense.id)) {
        return { nextState: state, applied: false };
      }
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          expenses: [action.expense, ...state.expenses],
        },
        applied: true,
        activityMeta: {
          category: 'expense',
          title: `नया खर्च: ₹${action.expense.amount.toLocaleString('en-IN')}`,
          detail: `${action.expense.title} (${action.expense.categoryHindi})`,
        },
      };
    }

    case 'staff:create': {
      if (state.staff.some((s) => s.id === action.staffMember.id)) {
        return { nextState: state, applied: false };
      }
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          staff: [...state.staff, action.staffMember],
        },
        applied: true,
        activityMeta: {
          category: 'staff',
          title: `नया स्टाफ जोड़ा: ${action.staffMember.name}`,
          detail: `${action.staffMember.roleHindi} • ${action.staffMember.phone}`,
        },
      };
    }

    case 'staff:update': {
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          staff: state.staff.map((s) =>
            s.id === action.staffMember.id ? action.staffMember : s
          ),
        },
        applied: true,
        activityMeta: {
          category: 'staff',
          title: `स्टाफ अपडेट: ${action.staffMember.name}`,
          detail: `${action.staffMember.roleHindi}`,
        },
      };
    }

    case 'staff:delete': {
      const target = state.staff.find((s) => s.id === action.staffId);
      if (!target) return { nextState: state, applied: false };
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          staff: state.staff.filter((s) => s.id !== action.staffId),
        },
        applied: true,
        activityMeta: {
          category: 'staff',
          title: `स्टाफ हटाया गया: ${target.name}`,
          detail: target.roleHindi,
        },
      };
    }

    case 'stock:raw_update': {
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          rawStock: action.rawStock,
        },
        applied: true,
        activityMeta: {
          category: 'inventory',
          title: `गेहूं व कच्चा स्टॉक अपडेट`,
          detail: `गेहूं: ${action.rawStock.wheatQuintals} क्विंटल`,
        },
      };
    }

    case 'stock:bag_update': {
      const nextBagStock = state.bagStock.map((item) => {
        if (item.productId === action.productId && item.bagSize === action.bagSize) {
          return { ...item, packedCount: action.newCount };
        }
        return item;
      });
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          bagStock: nextBagStock,
        },
        applied: true,
        activityMeta: {
          category: 'inventory',
          title: `पैक्ड बैग स्टॉक अपडेट`,
          detail: `${action.bagSize} Kg बैग → ${action.newCount} नग`,
        },
      };
    }

    case 'settings:update': {
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          settings: action.settings,
        },
        applied: true,
        activityMeta: {
          category: 'settings',
          title: `कंपनी सेटिंग्स अपडेट`,
          detail: action.settings.companyName,
        },
      };
    }

    case 'product:rate_update': {
      const nextProducts = state.products.map((p) => {
        if (p.id === action.productId) {
          return {
            ...p,
            rates: {
              ...p.rates,
              [action.bagSize]: action.rate,
            },
          };
        }
        return p;
      });
      return {
        nextState: {
          ...state,
          timestamp: nowIso,
          products: nextProducts,
        },
        applied: true,
        activityMeta: {
          category: 'settings',
          title: `आटा रेट अपडेट`,
          detail: `${action.bagSize} Kg बैग → ₹${action.rate}`,
        },
      };
    }

    case 'master:push_full_state': {
      return {
        nextState: {
          ...action.fullState,
          timestamp: nowIso,
        },
        applied: true,
        activityMeta: {
          category: 'sync',
          title: `मास्टर मोबाइल डेटा सिंक हुआ`,
          detail: `${action.fullState.orders.length} ऑर्डर, ${action.fullState.customers.length} ग्राहक`,
        },
      };
    }

    case 'master:reset_factory': {
      return {
        nextState: {
          ...action.fullState,
          timestamp: nowIso,
        },
        applied: true,
        activityMeta: {
          category: 'sync',
          title: `फैक्ट्री डेटा रीसेट किया गया`,
          detail: `सभी डिवाइस डिफ़ॉल्ट डेटा पर सिंक हुए`,
        },
      };
    }

    default:
      return { nextState: state, applied: false };
  }
}
