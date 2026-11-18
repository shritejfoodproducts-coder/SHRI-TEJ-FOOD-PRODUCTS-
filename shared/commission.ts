import type { CommissionType, Order, UserProfile } from '../src/types/erp.ts';

export function getOrderTotalBags(order: Pick<Order, 'items'>): number {
  return (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

export function calculateSalesmanOrderCommission(
  order: Pick<Order, 'totalAmount' | 'items'>,
  salesman?: Pick<UserProfile, 'commissionType' | 'commissionRate'>
): number {
  if (!salesman) return 0;
  const rate = Number(salesman.commissionRate) || 0;
  if (rate <= 0) return 0;

  const commType: CommissionType = salesman.commissionType || 'percent';
  if (commType === 'percent') {
    const raw = ((Number(order.totalAmount) || 0) * rate) / 100;
    return Math.round(raw * 100) / 100;
  }
  if (commType === 'per_bag') {
    const bags = getOrderTotalBags(order);
    return Math.round(bags * rate * 100) / 100;
  }
  if (commType === 'fixed_per_order') {
    return Math.round(rate * 100) / 100;
  }
  return 0;
}

export function resolveOrderCommission(
  order: Order,
  salesman?: Pick<UserProfile, 'commissionType' | 'commissionRate'>
): {
  creditedAmount: number;
  projectedAmount: number;
  isDelivered: boolean;
} {
  const isDelivered = order.status === 'delivered';
  if (isDelivered) {
    const credited =
      typeof order.salesmanCommissionAmount === 'number' && order.commissionCredited
        ? order.salesmanCommissionAmount
        : calculateSalesmanOrderCommission(order, salesman);
    return {
      creditedAmount: credited,
      projectedAmount: credited,
      isDelivered: true,
    };
  }
  const projected = calculateSalesmanOrderCommission(order, salesman);
  return {
    creditedAmount: 0,
    projectedAmount: projected,
    isDelivered: false,
  };
}

export function formatCommissionRuleHindi(
  salesman?: Pick<UserProfile, 'commissionType' | 'commissionRate'>
): string {
  if (!salesman) return 'कमीशन सेट नहीं';
  const rate = Number(salesman.commissionRate) || 0;
  if (rate <= 0) return '0% (कमीशन सेट नहीं)';
  const commType: CommissionType = salesman.commissionType || 'percent';
  if (commType === 'percent') return `${rate}% (डिलीवर्ड बिल पर)`;
  if (commType === 'per_bag') return `₹${rate} / बैग (डिलीवर्ड)`;
  return `₹${rate} / डिलीवर ऑर्डर`;
}
