import React from 'react';
import { ActiveTab } from './Sidebar';
import { UserRole } from '../types/erp';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Factory, 
  ClipboardList, 
  Truck, 
  FileSpreadsheet,
  Download
} from 'lucide-react';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentRole: UserRole;
  pendingOrdersCount: number;
  onOpenInstallModal?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  currentRole,
  pendingOrdersCount,
  onOpenInstallModal,
}) => {
  const tabs = [
    { id: 'dashboard' as ActiveTab, label: 'डैशबोर्ड', icon: LayoutDashboard },
    { id: 'orders' as ActiveTab, label: 'ऑर्डर', icon: ClipboardList, badge: pendingOrdersCount > 0 ? pendingOrdersCount : null },
    { id: 'inventory' as ActiveTab, label: 'स्टॉक', icon: Package },
    { id: 'production' as ActiveTab, label: 'उत्पादन', icon: Factory },
    { id: 'customers' as ActiveTab, label: 'ग्राहक', icon: Users },
    { id: 'delivery' as ActiveTab, label: 'डिलीवरी', icon: Truck },
    { id: 'reports' as ActiveTab, label: 'Excel', icon: FileSpreadsheet },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 flex justify-around items-center select-none shadow-lg no-print">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 relative transition rounded-lg ${
              isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
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
          className="flex flex-col items-center justify-center py-1 px-1.5 text-amber-400 font-bold rounded-lg hover:bg-slate-900 transition"
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
