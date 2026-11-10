import React from 'react';
import { UserRole } from '../types/erp';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Factory, 
  ClipboardList, 
  Truck, 
  UserCheck, 
  TrendingUp, 
  Landmark, 
  FileSpreadsheet, 
  Settings,
  Sparkles,
  Download,
  HardDrive
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard'
  | 'customers'
  | 'inventory'
  | 'production'
  | 'orders'
  | 'delivery'
  | 'staff'
  | 'accounting'
  | 'bank_expenses'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentRole: UserRole;
  pendingOrdersCount: number;
  lowStockCount: number;
  onOpenInstallModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentRole,
  pendingOrdersCount,
  lowStockCount,
  onOpenInstallModal,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      labelHindi: 'डैशबोर्ड (मुख्य स्क्रीन)',
      labelEn: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      visible: true,
    },
    {
      id: 'customers' as ActiveTab,
      labelHindi: 'ग्राहक खाता (Customers)',
      labelEn: 'Customers',
      icon: Users,
      badge: null,
      visible: currentRole !== 'production_head' && currentRole !== 'packing_staff',
    },
    {
      id: 'inventory' as ActiveTab,
      labelHindi: 'स्टॉक व इन्वेंट्री (Stock)',
      labelEn: 'Inventory',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} अलर्ट` : null,
      badgeColor: 'bg-rose-500 text-white',
      visible: true,
    },
    {
      id: 'production' as ActiveTab,
      labelHindi: 'उत्पादन व पिसाई (Production)',
      labelEn: 'Production',
      icon: Factory,
      badge: null,
      visible: currentRole !== 'delivery_staff',
    },
    {
      id: 'orders' as ActiveTab,
      labelHindi: 'ऑर्डर व बिलिंग (Orders)',
      labelEn: 'Orders',
      icon: ClipboardList,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
      visible: true,
    },
    {
      id: 'delivery' as ActiveTab,
      labelHindi: 'डिलीवरी ट्रैकिंग (Delivery)',
      labelEn: 'Delivery',
      icon: Truck,
      badge: null,
      visible: true,
    },
    {
      id: 'staff' as ActiveTab,
      labelHindi: 'स्टाफ मैनेजमेंट (Staff)',
      labelEn: 'Staff',
      icon: UserCheck,
      badge: null,
      visible: currentRole === 'admin' || currentRole === 'manager',
    },
    {
      id: 'accounting' as ActiveTab,
      labelHindi: 'लेखा-जोखा व मुनाफा (P&L)',
      labelEn: 'Accounting',
      icon: TrendingUp,
      badge: null,
      visible: currentRole === 'admin' || currentRole === 'accountant',
    },
    {
      id: 'bank_expenses' as ActiveTab,
      labelHindi: 'बैंक व खर्चे (Expenses)',
      labelEn: 'Bank & Expenses',
      icon: Landmark,
      badge: null,
      visible: currentRole === 'admin' || currentRole === 'accountant',
    },
    {
      id: 'reports' as ActiveTab,
      labelHindi: 'Excel रिपोर्ट्स व बैकअप',
      labelEn: 'Excel & Backup',
      icon: FileSpreadsheet,
      badge: 'Excel',
      badgeColor: 'bg-emerald-600 text-white',
      visible: currentRole === 'admin' || currentRole === 'manager' || currentRole === 'accountant',
    },
    {
      id: 'settings' as ActiveTab,
      labelHindi: 'फैक्ट्री सेटिंग्स (Settings)',
      labelEn: 'Settings',
      icon: Settings,
      badge: null,
      visible: currentRole === 'admin',
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 p-3 select-none shrink-0 min-h-[calc(100vh-60px)]">
      {/* Brand Subheader */}
      <div className="px-3 py-3 mb-2 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-200">फ्री ERP एडिशन</span>
          </div>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.5 rounded font-mono font-bold">
            NO CLOUD
          </span>
        </div>
        <p className="text-[11px] text-amber-400 font-medium mt-1">
          Tejstha (तेजस्था) आटा मिल
        </p>
      </div>

      {/* Free Install Banner Button */}
      {onOpenInstallModal && (
        <button
          onClick={onOpenInstallModal}
          className="mb-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">ऐप (APK) व API डाउनलोड</span>
              <span className="text-[10px] text-amber-300/80 block">मोबाइल ऐप व REST JSON</span>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
            Free
          </span>
        </button>
      )}

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {menuItems
          .filter(item => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span className="truncate">{item.labelHindi}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* Footer Info & Local Storage indicator */}
      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 px-2 space-y-1.5">
        <div className="flex justify-between items-center text-slate-300">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>स्टोरेज:</span>
          </span>
          <span className="text-emerald-400 font-semibold font-mono text-[10px]">
            केवल फ़ोन मेमोरी
          </span>
        </div>
        <p className="text-[10px] text-slate-500">
          शून्य क्लाउड चार्ज • 100% प्राइवेट व सुरक्षित
        </p>
      </div>
    </aside>
  );
};
