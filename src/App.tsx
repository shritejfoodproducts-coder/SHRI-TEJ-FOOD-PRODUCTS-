import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useRealtimeSync } from './hooks/useRealtimeSync';
import type { LiveActivityEvent, SyncableErpState } from '../shared/erpSyncTypes';

// Components
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Bell, X as CloseIcon } from 'lucide-react';

// Modals
import { InvoiceModal } from './components/InvoiceModal';
import { NewOrderModal } from './components/NewOrderModal';
import { NewProductionModal } from './components/NewProductionModal';
import { NewExpenseModal } from './components/NewExpenseModal';
import { NewCustomerModal } from './components/NewCustomerModal';
import { ReceivePaymentModal } from './components/ReceivePaymentModal';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { InstallModal } from './components/InstallModal';
import { LiveSyncModal } from './components/LiveSyncModal';

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
  const [showLiveSyncModal, setShowLiveSyncModal] = useState(false);
  const [installModalTab, setInstallModalTab] = useState<'apk' | 'api'>('apk');
  const [liveToast, setLiveToast] = useState<LiveActivityEvent | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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

  const getCurrentSyncState = useCallback((): SyncableErpState => ({
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
  }), [settings, products, rawStock, bagStock, customers, orders, production, expenses, staff]);

  const applySyncedFullState = useCallback((next: SyncableErpState) => {
    if (next.settings) setSettings(next.settings);
    if (next.products) setProducts(next.products);
    if (next.rawStock) setRawStock(next.rawStock);
    if (next.bagStock) setBagStock(next.bagStock);
    if (next.customers) setCustomers(next.customers);
    if (next.orders) setOrders(next.orders);
    if (next.production) setProduction(next.production);
    if (next.expenses) setExpenses(next.expenses);
    if (next.staff) setStaff(next.staff);
  }, []);

  const handleRemoteActivity = useCallback((evt: LiveActivityEvent) => {
    setLiveToast(evt);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setLiveToast(null);
    }, 6500);
  }, []);

  const sync = useRealtimeSync({
    currentUserRole: currentRole,
    getCurrentState: getCurrentSyncState,
    applyFullState: applySyncedFullState,
    isAppLoaded: initialLoaded,
    onRemoteActivity: handleRemoteActivity,
  });

  // Handler: New Order
  const handleOrderCreated = (newOrder: Order) => {
    sync.dispatchMutation({ type: 'order:create', order: newOrder });
    setShowNewOrderModal(false);
    setSelectedOrderForInvoice(newOrder);
  };

  // Handler: New Production Batch
  const handleProductionCreated = (batch: ProductionBatch) => {
    sync.dispatchMutation({ type: 'production:create', batch });
    setShowNewProductionModal(false);
  };

  // Handler: New Expense
  const handleExpenseCreated = (newExp: ExpenseRecord) => {
    sync.dispatchMutation({ type: 'expense:create', expense: newExp });
    setShowNewExpenseModal(false);
  };

  // Handler: New Customer
  const handleCustomerCreated = (newCust: Customer) => {
    sync.dispatchMutation({ type: 'customer:create', customer: newCust });
    setShowNewCustomerModal(false);
  };

  // Handler: Update Customer
  const handleCustomerUpdated = (updatedCust: Customer) => {
    sync.dispatchMutation({ type: 'customer:update', customer: updatedCust });
  };

  // Handler: Delete Customer
  const handleCustomerDeleted = (customerId: string) => {
    sync.dispatchMutation({ type: 'customer:delete', customerId });
  };

  // Handler: Add Staff
  const handleStaffAdded = (newStaff: UserProfile) => {
    sync.dispatchMutation({ type: 'staff:create', staffMember: newStaff });
  };

  // Handler: Update Staff
  const handleStaffUpdated = (updatedStaff: UserProfile) => {
    sync.dispatchMutation({ type: 'staff:update', staffMember: updatedStaff });
  };

  // Handler: Delete Staff
  const handleStaffDeleted = (staffId: string) => {
    sync.dispatchMutation({ type: 'staff:delete', staffId });
  };

  // Handler: Payment Received
  const handlePaymentReceived = (payment: CustomerPaymentRecord) => {
    sync.dispatchMutation({ type: 'payment:receive', payment });
    setShowReceivePaymentModal(false);
  };

  // Handler: Order status change
  const handleOrderStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    sync.dispatchMutation({
      type: 'order:status',
      orderId,
      newStatus,
      deliveredAt:
        newStatus === 'delivered'
          ? new Date().toISOString().slice(0, 16).replace('T', ' ')
          : undefined,
    });
  };

  // Handler: Update Order
  const handleOrderUpdated = (updatedOrder: Order, originalOrder: Order) => {
    sync.dispatchMutation({ type: 'order:update', updatedOrder, originalOrder });
  };

  // Handler: Delete Order
  const handleOrderDeleted = (orderId: string) => {
    sync.dispatchMutation({ type: 'order:delete', orderId });
  };

  // Handler: Update Production Batch
  const handleProductionUpdated = (updatedBatch: ProductionBatch, originalBatch: ProductionBatch) => {
    sync.dispatchMutation({ type: 'production:update', updatedBatch, originalBatch });
  };

  // Handler: Delete Production Batch
  const handleProductionDeleted = (batchId: string) => {
    sync.dispatchMutation({ type: 'production:delete', batchId });
  };

  // Handler: Raw Stock update
  const handleRawStockUpdate = (newRaw: RawMaterialStock) => {
    sync.dispatchMutation({ type: 'stock:raw_update', rawStock: newRaw });
  };

  // Handler: Bag Stock count update
  const handleBagStockUpdate = (productId: string, bagSize: BagSize, newCount: number) => {
    sync.dispatchMutation({ type: 'stock:bag_update', productId, bagSize, newCount });
  };

  // Handler: Save Settings
  const handleSaveSettings = (newSettings: CompanySettings) => {
    sync.dispatchMutation({ type: 'settings:update', settings: newSettings });
  };

  // Handler: Update product default rates
  const handleUpdateProductRate = (productId: string, bagSize: BagSize, rate: number) => {
    sync.dispatchMutation({ type: 'product:rate_update', productId, bagSize, rate });
  };

  // Handler: Restore State
  const handleRestoreState = (restored: AppDatabaseState) => {
    sync.dispatchMutation({ type: 'master:push_full_state', fullState: restored });
  };

  // Handler: Reset Factory Seeds
  const handleResetFactorySeeds = () => {
    const defaultState: SyncableErpState = {
      version: '2.4.0',
      timestamp: new Date().toISOString(),
      settings: INITIAL_SETTINGS,
      products: INITIAL_PRODUCTS,
      rawStock: INITIAL_RAW_STOCK,
      bagStock: INITIAL_BAG_STOCK,
      customers: INITIAL_CUSTOMERS,
      orders: INITIAL_ORDERS,
      production: INITIAL_PRODUCTION,
      expenses: INITIAL_EXPENSES,
      staff: INITIAL_STAFF,
    };
    sync.dispatchMutation({ type: 'master:reset_factory', fullState: defaultState });
  };

  // Notification Counters
  const pendingOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'in_production').length;
  const lowStockCount = bagStock.filter(b => b.packedCount <= b.minThreshold).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Real-time Incoming Entry Toast Banner */}
      {liveToast && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 max-w-sm w-[calc(100%-1.5rem)] bg-slate-950 text-white border-2 border-emerald-400 rounded-2xl shadow-2xl p-3.5 flex items-start gap-3 animate-bounce">
          <div className="p-2 bg-emerald-500/20 rounded-xl shrink-0">
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                लाइव मोबाइल अपडेट
              </span>
              <span className="text-[10px] text-slate-400">अभी</span>
            </div>
            <p className="text-xs font-bold text-white truncate mt-0.5">{liveToast.title}</p>
            <p className="text-[11px] text-slate-300 truncate">{liveToast.detail}</p>
            <p className="text-[10px] text-amber-300 font-semibold mt-0.5">
              द्वारा: {liveToast.actorName} ({liveToast.actorRole})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Main Navigation Header */}
      <Header
        currentRole={currentRole}
        settings={settings}
        lowStockCount={lowStockCount}
        syncStatus={sync.status}
        connectedDevicesCount={sync.connectedDevices.length}
        syncDeviceRole={sync.config.deviceRole}
        onOpenRoleSwitcher={() => setShowRoleSwitcherModal(true)}
        onOpenNewOrder={() => setShowNewOrderModal(true)}
        onOpenNewProduction={() => setShowNewProductionModal(true)}
        onOpenReceivePayment={() => {
          setReceivePaymentCustId(undefined);
          setShowReceivePaymentModal(true);
        }}
        onNavigateToInventory={() => setActiveTab('inventory')}
        onOpenInstallModal={() => handleOpenInstallModal('apk')}
        onOpenLiveSync={() => setShowLiveSyncModal(true)}
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
              onUpdateProduction={handleProductionUpdated}
              onDeleteProduction={handleProductionDeleted}
            />
          )}

          {activeTab === 'orders' && (
            <OrderView
              orders={orders}
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onSelectOrder={setSelectedOrderForInvoice}
              onUpdateOrderStatus={handleOrderStatusUpdate}
              onUpdateOrder={handleOrderUpdated}
              onDeleteOrder={handleOrderDeleted}
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
              onAddStaff={handleStaffAdded}
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
              onOpenLiveSync={() => setShowLiveSyncModal(true)}
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

      {/* Real-time Mobile Server & Multi-Device Sync Modal */}
      {showLiveSyncModal && (
        <LiveSyncModal
          onClose={() => setShowLiveSyncModal(false)}
          config={sync.config}
          status={sync.status}
          connectedDevices={sync.connectedDevices}
          recentEvents={sync.recentEvents}
          pendingCount={sync.pendingCount}
          lastSyncedAt={sync.lastSyncedAt}
          soundEnabled={sync.soundEnabled}
          onToggleSound={() => sync.setSoundEnabled((prev) => !prev)}
          onUpdateConfig={sync.updateSyncConfig}
          onPushMasterStateNow={sync.pushMasterStateNow}
        />
      )}
    </div>
  );
}
