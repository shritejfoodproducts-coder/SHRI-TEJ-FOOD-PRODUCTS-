import React, { useState, useEffect } from 'react';
import { 
  Order, 
  BagStockItem, 
  ProductMaster, 
  RawMaterialStock, 
  Customer, 
  ProductionBatch, 
  ExpenseRecord, 
  UserProfile, 
  CompanySettings,
  UserRole,
  OrderStatus,
  BagSize,
  CustomerPaymentRecord
} from './types/erp';
import { 
  INITIAL_SETTINGS, 
  INITIAL_PRODUCTS, 
  INITIAL_RAW_STOCK, 
  INITIAL_BAG_STOCK, 
  INITIAL_CUSTOMERS, 
  INITIAL_STAFF, 
  INITIAL_ORDERS, 
  INITIAL_PRODUCTION, 
  INITIAL_EXPENSES 
} from './data/initialData';
import { saveStateToStorage, loadStateFromStorage, AppDatabaseState } from './utils/backup';

// Components
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';

// Modals
import { InvoiceModal } from './components/InvoiceModal';
import { NewOrderModal } from './components/NewOrderModal';
import { NewProductionModal } from './components/NewProductionModal';
import { NewExpenseModal } from './components/NewExpenseModal';
import { NewCustomerModal } from './components/NewCustomerModal';
import { ReceivePaymentModal } from './components/ReceivePaymentModal';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { InstallModal } from './components/InstallModal';

// Views
import { DashboardView } from './views/DashboardView';
import { CustomerView } from './views/CustomerView';
import { InventoryView } from './views/InventoryView';
import { ProductionView } from './views/ProductionView';
import { OrderView } from './views/OrderView';
import { DeliveryView } from './views/DeliveryView';
import { StaffView } from './views/StaffView';
import { AccountingView } from './views/AccountingView';
import { BankExpenseView } from './views/BankExpenseView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

export default function App() {
  // Load initial from storage or defaults
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>(INITIAL_SETTINGS);
  const [products, setProducts] = useState<ProductMaster[]>(INITIAL_PRODUCTS);
  const [rawStock, setRawStock] = useState<RawMaterialStock>(INITIAL_RAW_STOCK);
  const [bagStock, setBagStock] = useState<BagStockItem[]>(INITIAL_BAG_STOCK);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [production, setProduction] = useState<ProductionBatch[]>(INITIAL_PRODUCTION);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [staff, setStaff] = useState<UserProfile[]>(INITIAL_STAFF);

  // App UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');

  // Modals
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showNewProductionModal, setShowNewProductionModal] = useState(false);
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showReceivePaymentModal, setShowReceivePaymentModal] = useState(false);
  const [receivePaymentCustId, setReceivePaymentCustId] = useState<string | undefined>(undefined);
  const [showRoleSwitcherModal, setShowRoleSwitcherModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installModalTab, setInstallModalTab] = useState<'apk' | 'api'>('apk');

  const handleOpenInstallModal = (tab: 'apk' | 'api' = 'apk') => {
    setInstallModalTab(tab);
    setShowInstallModal(true);
  };

  // Load on mount
  useEffect(() => {
    const saved = loadStateFromStorage();
    if (saved) {
      if (saved.settings) setSettings(saved.settings);
      if (saved.products) setProducts(saved.products);
      if (saved.rawStock) setRawStock(saved.rawStock);
      if (saved.bagStock) setBagStock(saved.bagStock);
      if (saved.customers) setCustomers(saved.customers);
      if (saved.orders) setOrders(saved.orders);
      if (saved.production) setProduction(saved.production);
      if (saved.expenses) setExpenses(saved.expenses);
      if (saved.staff) setStaff(saved.staff);
    }
    setInitialLoaded(true);
  }, []);

  // Save on state change after initial load (100% Mobile LocalStorage, Zero Cloud Cost)
  useEffect(() => {
    if (!initialLoaded) return;
    const currentState: AppDatabaseState = {
      version: '2.4.0',
      timestamp: new Date().toISOString(),
      settings,
      products,
      rawStock,
      bagStock,
      customers,
      orders,
      production,
      expenses,
      staff,
    };
    saveStateToStorage(currentState);
  }, [initialLoaded, settings, products, rawStock, bagStock, customers, orders, production, expenses, staff]);

  // Handler: New Order
  const handleOrderCreated = (newOrder: Order) => {
    setOrders([newOrder, ...orders]);

    // Update customer records
    setCustomers(customers.map((c) => {
      if (c.id === newOrder.customerId) {
        return {
          ...c,
          totalOrders: c.totalOrders + 1,
          totalPurchased: c.totalPurchased + newOrder.totalAmount,
          totalPaid: c.totalPaid + newOrder.paidAmount,
          currentDue: c.currentDue + newOrder.dueAmount,
          lastOrderDate: newOrder.date,
        };
      }
      return c;
    }));

    // Reserve bags in stock
    setBagStock(prev => prev.map(b => {
      const matchedLine = newOrder.items.find(i => i.productId === b.productId && i.bagSize === b.bagSize);
      if (matchedLine) {
        return {
          ...b,
          reservedCount: b.reservedCount + matchedLine.quantity,
        };
      }
      return b;
    }));

    setShowNewOrderModal(false);
    // Show invoice directly so user can print or share immediately!
    setSelectedOrderForInvoice(newOrder);
  };

  // Handler: New Production Batch
  const handleProductionCreated = (batch: ProductionBatch) => {
    setProduction([batch, ...production]);

    // 1. Reduce raw wheat stock (KG converted to quintals = KG / 100)
    const wheatUsedQuintals = batch.wheatInputKg / 100;
    const newWheatStock = Math.max(0, rawStock.wheatQuintals - wheatUsedQuintals);

    // 2. Reduce empty bags
    const newEmptyBags = { ...rawStock.emptyBags };
    (Object.keys(batch.packedBags) as unknown as BagSize[]).forEach(size => {
      const used = batch.packedBags[size] || 0;
      newEmptyBags[size] = Math.max(0, (newEmptyBags[size] || 0) - used);
    });

    setRawStock({
      ...rawStock,
      wheatQuintals: newWheatStock,
      emptyBags: newEmptyBags,
      lastUpdated: new Date().toISOString(),
    });

    // 3. Increase finished bag stock for this product
    setBagStock(prev => prev.map(item => {
      if (item.productId === batch.productId && batch.packedBags[item.bagSize]) {
        const added = batch.packedBags[item.bagSize] || 0;
        return {
          ...item,
          packedCount: item.packedCount + added,
        };
      }
      return item;
    }));

    setShowNewProductionModal(false);
  };

  // Handler: New Expense
  const handleExpenseCreated = (newExp: ExpenseRecord) => {
    setExpenses([newExp, ...expenses]);
    setShowNewExpenseModal(false);
  };

  // Handler: New Customer
  const handleCustomerCreated = (newCust: Customer) => {
    setCustomers([newCust, ...customers]);
    setShowNewCustomerModal(false);
  };

  // Handler: Update Customer
  const handleCustomerUpdated = (updatedCust: Customer) => {
    setCustomers(customers.map(c => c.id === updatedCust.id ? updatedCust : c));
  };

  // Handler: Delete Customer
  const handleCustomerDeleted = (customerId: string) => {
    setCustomers(customers.filter(c => c.id !== customerId));
  };

  // Handler: Update Staff
  const handleStaffUpdated = (updatedStaff: UserProfile) => {
    setStaff(staff.map(s => s.id === updatedStaff.id ? updatedStaff : s));
  };

  // Handler: Delete Staff
  const handleStaffDeleted = (staffId: string) => {
    setStaff(staff.filter(s => s.id !== staffId));
  };

  // Handler: Payment Received
  const handlePaymentReceived = (payment: CustomerPaymentRecord) => {
    setCustomers(customers.map(c => {
      if (c.id === payment.customerId) {
        return {
          ...c,
          totalPaid: c.totalPaid + payment.amount,
          currentDue: Math.max(0, c.currentDue - payment.amount),
        };
      }
      return c;
    }));
    setShowReceivePaymentModal(false);
  };

  // Handler: Order status change
  const handleOrderStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        const updated: Order = {
          ...o,
          status: newStatus,
        };
        if (newStatus === 'delivered') {
          updated.deliveredAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
          // Unreserve and deduct from packed stock
          setBagStock(prev => prev.map(b => {
            const matched = o.items.find(i => i.productId === b.productId && i.bagSize === b.bagSize);
            if (matched) {
              return {
                ...b,
                packedCount: Math.max(0, b.packedCount - matched.quantity),
                reservedCount: Math.max(0, b.reservedCount - matched.quantity),
              };
            }
            return b;
          }));
        }
        return updated;
      }
      return o;
    }));
  };

  // Handler: Raw Stock update
  const handleRawStockUpdate = (newRaw: RawMaterialStock) => {
    setRawStock(newRaw);
  };

  // Handler: Bag Stock count update
  const handleBagStockUpdate = (productId: string, bagSize: BagSize, newCount: number) => {
    setBagStock(bagStock.map(item => {
      if (item.productId === productId && item.bagSize === bagSize) {
        return { ...item, packedCount: newCount };
      }
      return item;
    }));
  };

  // Handler: Save Settings
  const handleSaveSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
  };

  // Handler: Update product default rates
  const handleUpdateProductRate = (productId: string, bagSize: BagSize, rate: number) => {
    setProducts(products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          rates: {
            ...p.rates,
            [bagSize]: rate,
          },
        };
      }
      return p;
    }));
  };

  // Handler: Restore State
  const handleRestoreState = (restored: AppDatabaseState) => {
    if (restored.settings) setSettings(restored.settings);
    if (restored.products) setProducts(restored.products);
    if (restored.rawStock) setRawStock(restored.rawStock);
    if (restored.bagStock) setBagStock(restored.bagStock);
    if (restored.customers) setCustomers(restored.customers);
    if (restored.orders) setOrders(restored.orders);
    if (restored.production) setProduction(restored.production);
    if (restored.expenses) setExpenses(restored.expenses);
    if (restored.staff) setStaff(restored.staff);
  };

  // Handler: Reset Factory Seeds
  const handleResetFactorySeeds = () => {
    setSettings(INITIAL_SETTINGS);
    setProducts(INITIAL_PRODUCTS);
    setRawStock(INITIAL_RAW_STOCK);
    setBagStock(INITIAL_BAG_STOCK);
    setCustomers(INITIAL_CUSTOMERS);
    setOrders(INITIAL_ORDERS);
    setProduction(INITIAL_PRODUCTION);
    setExpenses(INITIAL_EXPENSES);
    setStaff(INITIAL_STAFF);
    alert('फैक्ट्री ERP डेटा सफलतापूर्वक रीसेट कर दिया गया है!');
  };

  // Notification Counters
  const pendingOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'in_production').length;
  const lowStockCount = bagStock.filter(b => b.packedCount <= b.minThreshold).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Top Main Navigation Header */}
      <Header
        currentRole={currentRole}
        settings={settings}
        lowStockCount={lowStockCount}
        onOpenRoleSwitcher={() => setShowRoleSwitcherModal(true)}
        onOpenNewOrder={() => setShowNewOrderModal(true)}
        onOpenNewProduction={() => setShowNewProductionModal(true)}
        onOpenReceivePayment={() => {
          setReceivePaymentCustId(undefined);
          setShowReceivePaymentModal(true);
        }}
        onNavigateToInventory={() => setActiveTab('inventory')}
        onOpenInstallModal={() => handleOpenInstallModal('apk')}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar for Desktop */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentRole={currentRole}
          pendingOrdersCount={pendingOrdersCount}
          lowStockCount={lowStockCount}
          onOpenInstallModal={() => handleOpenInstallModal('apk')}
        />

        {/* Dynamic View Area */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              orders={orders}
              customers={customers}
              rawStock={rawStock}
              bagStock={bagStock}
              products={products}
              production={production}
              expenses={expenses}
              staff={staff}
              settings={settings}
              currentRole={currentRole}
              onNavigate={setActiveTab}
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onOpenNewProduction={() => setShowNewProductionModal(true)}
              onOpenReceivePayment={() => {
                setReceivePaymentCustId(undefined);
                setShowReceivePaymentModal(true);
              }}
              onSelectOrder={setSelectedOrderForInvoice}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerView
              customers={customers}
              orders={orders}
              settings={settings}
              onOpenNewCustomer={() => setShowNewCustomerModal(true)}
              onOpenReceivePayment={(custId) => {
                setReceivePaymentCustId(custId);
                setShowReceivePaymentModal(true);
              }}
              onSelectOrder={setSelectedOrderForInvoice}
              onUpdateCustomer={handleCustomerUpdated}
              onDeleteCustomer={handleCustomerDeleted}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              rawStock={rawStock}
              bagStock={bagStock}
              products={products}
              onUpdateRawStock={handleRawStockUpdate}
              onUpdateBagStock={handleBagStockUpdate}
            />
          )}

          {activeTab === 'production' && (
            <ProductionView
              production={production}
              products={products}
              orders={orders}
              bagStock={bagStock}
              onOpenNewProduction={() => setShowNewProductionModal(true)}
            />
          )}

          {activeTab === 'orders' && (
            <OrderView
              orders={orders}
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onSelectOrder={setSelectedOrderForInvoice}
              onUpdateOrderStatus={handleOrderStatusUpdate}
            />
          )}

          {activeTab === 'delivery' && (
            <DeliveryView
              orders={orders}
              onUpdateOrderStatus={handleOrderStatusUpdate}
              onSelectOrder={setSelectedOrderForInvoice}
            />
          )}

          {activeTab === 'staff' && (
            <StaffView
              staffList={staff}
              currentRole={currentRole}
              onAddStaff={(newS) => setStaff([...staff, newS])}
              onUpdateStaff={handleStaffUpdated}
              onDeleteStaff={handleStaffDeleted}
              onSwitchRole={setCurrentRole}
            />
          )}

          {activeTab === 'accounting' && (
            <AccountingView
              orders={orders}
              expenses={expenses}
              customers={customers}
              products={products}
            />
          )}

          {activeTab === 'bank_expenses' && (
            <BankExpenseView
              expenses={expenses}
              orders={orders}
              settings={settings}
              onOpenNewExpense={() => setShowNewExpenseModal(true)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              orders={orders}
              customers={customers}
              rawStock={rawStock}
              bagStock={bagStock}
              products={products}
              production={production}
              expenses={expenses}
              staff={staff}
              settings={settings}
              onRestoreState={handleRestoreState}
              onResetFactorySeeds={handleResetFactorySeeds}
              onOpenDownloadModal={handleOpenInstallModal}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              products={products}
              onSaveSettings={handleSaveSettings}
              onUpdateProductRate={handleUpdateProductRate}
              onOpenInstallModal={() => handleOpenInstallModal('apk')}
            />
          )}
        </main>
      </div>

      {/* Mobile Sticky Navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentRole={currentRole}
        pendingOrdersCount={pendingOrdersCount}
        onOpenInstallModal={() => handleOpenInstallModal('apk')}
      />

      {/* Interactive Modals */}
      {selectedOrderForInvoice && (
        <InvoiceModal
          order={selectedOrderForInvoice}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}

      {showNewOrderModal && (
        <NewOrderModal
          customers={customers}
          products={products}
          staff={staff}
          onClose={() => setShowNewOrderModal(false)}
          onSubmit={handleOrderCreated}
        />
      )}

      {showNewProductionModal && (
        <NewProductionModal
          products={products}
          staff={staff}
          onClose={() => setShowNewProductionModal(false)}
          onSubmit={handleProductionCreated}
        />
      )}

      {showNewExpenseModal && (
        <NewExpenseModal
          onClose={() => setShowNewExpenseModal(false)}
          onSubmit={handleExpenseCreated}
        />
      )}

      {showNewCustomerModal && (
        <NewCustomerModal
          onClose={() => setShowNewCustomerModal(false)}
          onSubmit={handleCustomerCreated}
        />
      )}

      {showReceivePaymentModal && (
        <ReceivePaymentModal
          customers={customers}
          selectedCustomerId={receivePaymentCustId}
          onClose={() => setShowReceivePaymentModal(false)}
          onSubmit={handlePaymentReceived}
        />
      )}

      {showRoleSwitcherModal && (
        <RoleSwitcherModal
          currentRole={currentRole}
          staffList={staff}
          onSelectRole={setCurrentRole}
          onClose={() => setShowRoleSwitcherModal(false)}
        />
      )}

      {/* Free App (APK) & API Download Center Modal */}
      {showInstallModal && (
        <InstallModal 
          onClose={() => setShowInstallModal(false)}
          initialTab={installModalTab}
          currentState={{
            version: '2.4.0',
            timestamp: new Date().toISOString(),
            settings,
            products,
            rawStock,
            bagStock,
            customers,
            orders,
            production,
            expenses,
            staff,
          }}
        />
      )}
    </div>
  );
}
