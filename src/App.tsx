import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Order,
  UserProfile,
  CompanySettings,
  UserRole,
  OrderStatus,
  BagSize,
  CustomerPaymentRecord,
  Customer,
  ProductionBatch,
  ExpenseRecord,
  RawMaterialStock,
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
  INITIAL_EXPENSES,
} from './data/initialData';
import type { AppDatabaseState } from './utils/backup';
import { getEffectivePermissions } from './utils/permissions';
import { useFirestoreErpSync } from './hooks/useFirestoreErpSync';
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
import { LoginScreen } from './components/LoginScreen';

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
  // App UI State & Staff Role Authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('salesman');
  const [currentStaffId, setCurrentStaffId] = useState<string>('');
  const autoLoginAttemptedRef = useRef(false);

  // Modals & Live Toast
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
  const [writeErrorBanner, setWriteErrorBanner] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const handleRemoteActivity = useCallback((evt: LiveActivityEvent) => {
    setLiveToast(evt);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setLiveToast(null);
    }, 6500);
  }, []);

  // Primary Persistence & Real-time Multi-Mobile Listener via Firebase Firestore onSnapshot
  const sync = useFirestoreErpSync({
    currentUserRole: isAuthenticated ? currentRole : 'salesman',
    isAuthenticatedInErp: isAuthenticated,
    onRemoteActivity: handleRemoteActivity,
  });

  const {
    settings,
    products,
    rawStock,
    bagStock,
    customers,
    orders,
    production,
    expenses,
    staff,
  } = sync;

  // Restore "Remember Me" staff login once Firebase Auth + Firestore snapshot is ready
  useEffect(() => {
    if (!sync.firebaseUser || !sync.firestoreReady) {
      if (!sync.firebaseUser) {
        autoLoginAttemptedRef.current = false;
        setIsAuthenticated(false);
      }
      return;
    }

    if (autoLoginAttemptedRef.current) return;
    autoLoginAttemptedRef.current = true;

    const rememberedId =
      typeof window !== 'undefined'
        ? localStorage.getItem('tej_food_remembered_user_id')
        : null;
    if (rememberedId) {
      const rememberedUser = staff.find((s) => s.id === rememberedId && s.active);
      if (rememberedUser) {
        setCurrentStaffId(rememberedUser.id);
        setCurrentRole(rememberedUser.role);
        setIsAuthenticated(true);
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('tej_food_remembered_user_id');
      }
    }
  }, [sync.firebaseUser, sync.firestoreReady, staff]);

  const activeStaffMember =
    staff.find((s) => s.id === currentStaffId) ||
    staff.find((s) => s.role === currentRole) ||
    staff[0];
  const activePermissions = getEffectivePermissions(activeStaffMember, currentRole);
  const canManageStaff = currentRole === 'admin' || activePermissions.manageStaff;

  const isTabAllowed = useCallback(
    (tab: ActiveTab): boolean => {
      switch (tab) {
        case 'dashboard':
          return true;
        case 'customers':
          return activePermissions.viewCustomers;
        case 'inventory':
          return activePermissions.viewInventory;
        case 'production':
          return activePermissions.viewProduction;
        case 'orders':
          return activePermissions.viewOrders;
        case 'delivery':
          return activePermissions.viewDelivery;
        case 'staff':
          return currentRole === 'admin' || activePermissions.manageStaff;
        case 'accounting':
          return activePermissions.viewAccounting;
        case 'bank_expenses':
          return activePermissions.viewAccounting || activePermissions.addExpense;
        case 'reports':
          return activePermissions.viewReports;
        case 'settings':
          return currentRole === 'admin' || activePermissions.manageSettings;
        default:
          return true;
      }
    },
    [activePermissions, currentRole]
  );

  useEffect(() => {
    if (!isTabAllowed(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isTabAllowed]);

  const runMutation = useCallback(
    (action: Parameters<typeof sync.dispatchMutation>[0]) => {
      setWriteErrorBanner(null);
      sync.dispatchMutation(action, activeStaffMember?.name).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setWriteErrorBanner(
          msg.includes('permission') || msg.includes('PERMISSION_DENIED')
            ? 'इस कार्य को Firestore में सेव करने की अनुमति नहीं है। कृपया Admin खाते से जांचें।'
            : `डेटा सेव करने में त्रुटि: ${msg}`
        );
      });
    },
    [sync, activeStaffMember?.name]
  );

  const handleSelectStaffMember = (member: UserProfile) => {
    setCurrentStaffId(member.id);
    setCurrentRole(member.role);
  };

  const handleSwitchRole = (nextRole: UserRole) => {
    setCurrentRole(nextRole);
    const matched = staff.find((s) => s.role === nextRole);
    if (matched) {
      setCurrentStaffId(matched.id);
    }
  };

  const handleOpenInstallModal = (tab: 'apk' | 'api' = 'apk') => {
    setInstallModalTab(tab);
    setShowInstallModal(true);
  };

  const handleLoginSuccess = (member: UserProfile, rememberMe: boolean) => {
    setCurrentStaffId(member.id);
    setCurrentRole(member.role);
    setActiveTab('dashboard');
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem('tej_food_remembered_user_id', member.id);
      } else {
        localStorage.removeItem('tej_food_remembered_user_id');
      }
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tej_food_remembered_user_id');
    }
    setShowRoleSwitcherModal(false);
    setIsAuthenticated(false);
    setCurrentStaffId('');
    setCurrentRole('salesman');
    setActiveTab('dashboard');
  };

  const handleResetPassword = (updatedMember: UserProfile) => {
    runMutation({ type: 'staff:update', staffMember: updatedMember });
  };

  // Handlers dispatching directly to Firebase Firestore
  const handleOrderCreated = (newOrder: Order) => {
    runMutation({ type: 'order:create', order: newOrder });
    setShowNewOrderModal(false);
    setSelectedOrderForInvoice(newOrder);
  };

  const handleProductionCreated = (batch: ProductionBatch) => {
    runMutation({ type: 'production:create', batch });
    setShowNewProductionModal(false);
  };

  const handleExpenseCreated = (newExp: ExpenseRecord) => {
    runMutation({ type: 'expense:create', expense: newExp });
    setShowNewExpenseModal(false);
  };

  const handleCustomerCreated = (newCust: Customer) => {
    runMutation({ type: 'customer:create', customer: newCust });
    setShowNewCustomerModal(false);
  };

  const handleCustomerUpdated = (updatedCust: Customer) => {
    runMutation({ type: 'customer:update', customer: updatedCust });
  };

  const handleCustomerDeleted = (customerId: string) => {
    runMutation({ type: 'customer:delete', customerId });
  };

  const handleStaffAdded = (newStaff: UserProfile) => {
    if (!canManageStaff) return;
    runMutation({ type: 'staff:create', staffMember: newStaff });
  };

  const handleStaffUpdated = (updatedStaff: UserProfile) => {
    if (!canManageStaff) return;
    runMutation({ type: 'staff:update', staffMember: updatedStaff });
  };

  const handleStaffDeleted = (staffId: string) => {
    if (!canManageStaff) return;
    runMutation({ type: 'staff:delete', staffId });
  };

  const handlePaymentReceived = (payment: CustomerPaymentRecord) => {
    runMutation({ type: 'payment:receive', payment });
    setShowReceivePaymentModal(false);
  };

  const handleOrderStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    runMutation({
      type: 'order:status',
      orderId,
      newStatus,
      deliveredAt:
        newStatus === 'delivered'
          ? new Date().toISOString().slice(0, 16).replace('T', ' ')
          : undefined,
    });
  };

  const handleOrderUpdated = (updatedOrder: Order, originalOrder: Order) => {
    runMutation({ type: 'order:update', updatedOrder, originalOrder });
  };

  const handleOrderDeleted = (orderId: string) => {
    runMutation({ type: 'order:delete', orderId });
  };

  const handleProductionUpdated = (
    updatedBatch: ProductionBatch,
    originalBatch: ProductionBatch
  ) => {
    runMutation({ type: 'production:update', updatedBatch, originalBatch });
  };

  const handleProductionDeleted = (batchId: string) => {
    runMutation({ type: 'production:delete', batchId });
  };

  const handleRawStockUpdate = (newRaw: RawMaterialStock) => {
    runMutation({ type: 'stock:raw_update', rawStock: newRaw });
  };

  const handleBagStockUpdate = (
    productId: string,
    bagSize: BagSize,
    newCount: number
  ) => {
    runMutation({ type: 'stock:bag_update', productId, bagSize, newCount });
  };

  const handleSaveSettings = (newSettings: CompanySettings) => {
    runMutation({ type: 'settings:update', settings: newSettings });
  };

  const handleUpdateProductRate = (
    productId: string,
    bagSize: BagSize,
    rate: number
  ) => {
    runMutation({ type: 'product:rate_update', productId, bagSize, rate });
  };

  const handleRestoreState = (restored: AppDatabaseState) => {
    runMutation({ type: 'master:push_full_state', fullState: restored });
  };

  const handleResetFactorySeeds = () => {
    const defaultState: SyncableErpState = {
      version: '2.5.0',
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
    runMutation({ type: 'master:reset_factory', fullState: defaultState });
  };

  // Notification Counters
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'in_production'
  ).length;
  const lowStockCount = bagStock.filter((b) => b.packedCount <= b.minThreshold).length;

  if (!isAuthenticated || !sync.firebaseUser || !sync.firestoreReady) {
    return (
      <>
        <LoginScreen
          settings={settings}
          staffList={staff}
          syncStatus={sync.status}
          connectedDevicesCount={sync.connectedDevices.length}
          syncRoomId={sync.config.roomId}
          syncServerUrl={sync.config.syncServerUrl}
          authReady={sync.authReady}
          firebaseEmail={sync.firebaseUser?.email}
          authError={sync.authError}
          unauthorizedDomainHost={sync.unauthorizedDomainHost}
          isSigningIn={sync.isSigningIn}
          firestoreReady={sync.firestoreReady}
          accessDenied={sync.accessDenied}
          connectionError={sync.connectionError}
          onGoogleSignIn={sync.signInWithGoogle}
          onGoogleSignOut={sync.signOutGoogle}
          onLoginSuccess={handleLoginSuccess}
          onResetPassword={handleResetPassword}
          onOpenLiveSync={() => setShowLiveSyncModal(true)}
        />
        {showLiveSyncModal && (
          <LiveSyncModal
            onClose={() => setShowLiveSyncModal(false)}
            config={sync.config}
            status={sync.status}
            firebaseEmail={sync.firebaseUser?.email}
            connectionError={sync.connectionError}
            connectedDevices={sync.connectedDevices}
            recentEvents={sync.recentEvents}
            lastSyncedAt={sync.lastSyncedAt}
            soundEnabled={sync.soundEnabled}
            onToggleSound={() => sync.setSoundEnabled((prev) => !prev)}
            onUpdateConfig={sync.updateSyncConfig}
            onReconnectNow={sync.reconnectNow}
            onProbeServer={sync.probeServerHealth}
            onPushMasterStateNow={sync.pushMasterStateNow}
            onGoogleSignIn={sync.signInWithGoogle}
            onGoogleSignOut={sync.signOutGoogle}
          />
        )}
      </>
    );
  }

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
                लाइव मोबाइल अपडेट (Firestore)
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

      {/* Firestore Write Error Banner (if any) */}
      {writeErrorBanner && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2">
          <span>{writeErrorBanner}</span>
          <button
            type="button"
            onClick={() => setWriteErrorBanner(null)}
            className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 cursor-pointer"
          >
            बंद करें
          </button>
        </div>
      )}

      {/* Top Main Navigation Header */}
      <Header
        currentRole={currentRole}
        currentUserName={activeStaffMember?.name}
        permissions={activePermissions}
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
        onLogout={handleLogout}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentRole={currentRole}
          permissions={activePermissions}
          pendingOrdersCount={pendingOrdersCount}
          lowStockCount={lowStockCount}
          onOpenInstallModal={() => handleOpenInstallModal('apk')}
        />

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
              permissions={activePermissions}
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
              canReceivePayment={activePermissions.receivePayment}
              onOpenNewCustomer={() => setShowNewCustomerModal(true)}
              onOpenReceivePayment={(custId) => {
                setReceivePaymentCustId(custId);
                setShowReceivePaymentModal(true);
              }}
              onSelectOrder={setSelectedOrderForInvoice}
              onUpdateCustomer={activePermissions.editCustomers ? handleCustomerUpdated : undefined}
              onDeleteCustomer={activePermissions.editCustomers ? handleCustomerDeleted : undefined}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              rawStock={rawStock}
              bagStock={bagStock}
              products={products}
              canEdit={activePermissions.editInventory}
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
              onUpdateProduction={activePermissions.editProduction ? handleProductionUpdated : undefined}
              onDeleteProduction={activePermissions.editProduction ? handleProductionDeleted : undefined}
            />
          )}

          {activeTab === 'orders' && (
            <OrderView
              orders={orders}
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onSelectOrder={setSelectedOrderForInvoice}
              onUpdateOrderStatus={handleOrderStatusUpdate}
              onUpdateOrder={activePermissions.editOrders ? handleOrderUpdated : undefined}
              onDeleteOrder={activePermissions.editOrders ? handleOrderDeleted : undefined}
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
              currentStaffId={activeStaffMember?.id}
              canManageStaff={canManageStaff}
              onAddStaff={handleStaffAdded}
              onUpdateStaff={canManageStaff ? handleStaffUpdated : undefined}
              onDeleteStaff={canManageStaff ? handleStaffDeleted : undefined}
              onSwitchRole={handleSwitchRole}
              onSelectStaffMember={handleSelectStaffMember}
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
              canAddExpense={activePermissions.addExpense}
              canViewBalances={activePermissions.viewAccounting}
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
        permissions={activePermissions}
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
          currentStaffId={activeStaffMember?.id}
          staffList={staff}
          onSelectRole={handleSwitchRole}
          onSelectUser={handleSelectStaffMember}
          onLogout={handleLogout}
          onClose={() => setShowRoleSwitcherModal(false)}
        />
      )}

      {/* Free App (APK) & API Download Center Modal */}
      {showInstallModal && (
        <InstallModal
          onClose={() => setShowInstallModal(false)}
          initialTab={installModalTab}
          currentState={{
            version: '2.5.0',
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

      {/* Real-time Firebase Cloud Sync Modal */}
      {showLiveSyncModal && (
        <LiveSyncModal
          onClose={() => setShowLiveSyncModal(false)}
          config={sync.config}
          status={sync.status}
          firebaseEmail={sync.firebaseUser?.email}
          connectionError={sync.connectionError}
          connectedDevices={sync.connectedDevices}
          recentEvents={sync.recentEvents}
          lastSyncedAt={sync.lastSyncedAt}
          soundEnabled={sync.soundEnabled}
          onToggleSound={() => sync.setSoundEnabled((prev) => !prev)}
          onUpdateConfig={sync.updateSyncConfig}
          onReconnectNow={sync.reconnectNow}
          onProbeServer={sync.probeServerHealth}
          onPushMasterStateNow={sync.pushMasterStateNow}
          onGoogleSignIn={sync.signInWithGoogle}
          onGoogleSignOut={sync.signOutGoogle}
        />
      )}
    </div>
  );
}
