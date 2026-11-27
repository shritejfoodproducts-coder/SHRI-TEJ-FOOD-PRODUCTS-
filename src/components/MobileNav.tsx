import React from 'react';
import { ActiveTab } from './Sidebar';
import { StaffPermissions, UserRole } from '../types/erp';
import { getDefaultPermissionsForRole } from '../utils/permissions';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Factory, 
  ClipboardList, 
  Truck, 
  FileSpreadsheet,
  UserCheck,
  Download,
  Briefcase,
  Store,
  Settings
} from 'lucide-react';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentRole: UserRole;
  permissions?: StaffPermissions;
  pendingOrdersCount: number;
  onOpenInstallModal?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  currentRole,
  permissions,
  pendingOrdersCount,
  onOpenInstallModal,
}) => {
  const perms = permissions || getDefaultPermissionsForRole(currentRole);

  const tabs = [
    { id: 'dashboard' as ActiveTab, label: 'डैशबोर्ड', icon: LayoutDashboard, visible: true },
    { id: 'orders' as ActiveTab, label: 'ऑर्डर', icon: ClipboardList, badge: pendingOrdersCount > 0 ? pendingOrdersCount : null, visible: perms.viewOrders },
    { id: 'wholesale_dealers' as ActiveTab, label: 'होलसेल', icon: Store, visible: perms.viewCustomers },
    { id: 'retail_customers' as ActiveTab, label: 'रिटेल', icon: Users, visible: perms.viewCustomers },
    { id: 'inventory' as ActiveTab, label: 'स्टॉक', icon: Package, visible: perms.viewInventory },
    { id: 'production' as ActiveTab, label: 'उत्पादन', icon: Factory, visible: perms.viewProduction },
    {
      id: 'salesman_ledger' as ActiveTab,
      label: 'सेल्समैन',
      icon: Briefcase,
      visible:
        currentRole === 'admin' ||
        currentRole === 'manager' ||
        currentRole === 'accountant' ||
        currentRole === 'salesman' ||
        perms.manageStaff ||
        perms.viewReports,
    },
    { id: 'delivery' as ActiveTab, label: 'डिलीवरी', icon: Truck, visible: perms.viewDelivery },
    { id: 'staff' as ActiveTab, label: 'स्टाफ', icon: UserCheck, visible: currentRole === 'admin' || perms.manageStaff },
    { id: 'reports' as ActiveTab, label: 'Excel', icon: FileSpreadsheet, visible: perms.viewReports },
    { id: 'settings' as ActiveTab, label: 'सेटिंग्स', icon: Settings, visible: currentRole === 'admin' || perms.manageSettings },
  ].filter((t) => t.visible);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 flex justify-start sm:justify-around items-center gap-1 overflow-x-auto select-none shadow-lg no-print">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 min-w-[54px] flex flex-col items-center justify-center py-1.5 px-2 relative transition rounded-lg ${
              isActive ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge && (
                <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 text-[9px] font-black px-1 rounded-full">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}

      {/* Direct Mobile Install trigger */}
      {onOpenInstallModal && (
        <button
          onClick={onOpenInstallModal}
          className="shrink-0 min-w-[54px] flex flex-col items-center justify-center py-1 px-1.5 text-amber-400 font-bold rounded-lg hover:bg-slate-900 transition"
          title="फ्री ऐप इंस्टॉल करें"
        >
          <div className="p-1 bg-amber-500 text-slate-950 rounded-md">
            <Download className="w-3.5 h-3.5" />
          </div>
          <span className="text-[9px] mt-0.5">इंस्टॉल</span>
        </button>
      )}
    </nav>
  );
};
