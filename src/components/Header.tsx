import React, { useState, useEffect } from 'react';
import { UserRole, CompanySettings, StaffPermissions } from '../types/erp';
import { getDefaultPermissionsForRole } from '../utils/permissions';
import { 
  Smartphone, 
  ShoppingCart, 
  Factory, 
  IndianRupee, 
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  Radio,
  Crown,
  LogOut,
  Cloud,
  Settings
} from 'lucide-react';
import type { SyncConnectionStatus } from '../hooks/useFirestoreErpSync';
import type { SyncDeviceRole } from '../../shared/erpSyncTypes';

interface HeaderProps {
  currentRole: UserRole;
  currentUserName?: string;
  permissions?: StaffPermissions;
  settings: CompanySettings;
  lowStockCount: number;
  syncStatus?: SyncConnectionStatus;
  connectedDevicesCount?: number;
  syncDeviceRole?: SyncDeviceRole;
  isSettingsActive?: boolean;
  onOpenRoleSwitcher: () => void;
  onOpenNewOrder: () => void;
  onOpenNewProduction: () => void;
  onOpenReceivePayment: () => void;
  onNavigateToInventory: () => void;
  onNavigateToSettings?: () => void;
  onOpenInstallModal: () => void;
  onOpenLiveSync?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUserName,
  permissions,
  settings,
  lowStockCount,
  syncStatus = 'connecting',
  connectedDevicesCount = 1,
  syncDeviceRole = 'master',
  isSettingsActive = false,
  onOpenRoleSwitcher,
  onOpenNewOrder,
  onOpenNewProduction,
  onOpenReceivePayment,
  onNavigateToInventory,
  onNavigateToSettings,
  onOpenInstallModal,
  onOpenLiveSync,
  onLogout,
}) => {
  const perms = permissions || getDefaultPermissionsForRole(currentRole);
  const canManageSettings = currentRole === 'admin' || perms.manageSettings;
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(() => {
      updateTime();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'मालिक (Admin)', color: 'bg-amber-500 text-slate-950 font-bold border-amber-400' };
      case 'manager':
        return { label: 'मैनेजर (Manager)', color: 'bg-blue-600 text-white font-semibold border-blue-500' };
      case 'accountant':
        return { label: 'अकाउंटेंट (मुनीम)', color: 'bg-emerald-600 text-white font-semibold border-emerald-500' };
      case 'store_keeper':
        return { label: 'स्टोर कीपर (गोदाम)', color: 'bg-purple-600 text-white font-semibold border-purple-500' };
      case 'production_head':
        return { label: 'प्रोडक्शन इंचार्ज', color: 'bg-orange-600 text-white font-semibold border-orange-500' };
      case 'packing_staff':
        return { label: 'पैकिंग स्टाफ', color: 'bg-teal-600 text-white font-semibold border-teal-500' };
      case 'delivery_staff':
        return { label: 'डिलीवरी स्टाफ (ड्राइवर)', color: 'bg-indigo-600 text-white font-semibold border-indigo-500' };
      case 'salesman':
        return { label: 'सेल्समैन (मार्केट)', color: 'bg-amber-600 text-white font-semibold border-amber-500' };
      default:
        return { label: role, color: 'bg-slate-700 text-white' };
    }
  };

  const roleInfo = getRoleBadge(currentRole);

  return (
    <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative shrink-0">
            <img
              src="/logo.png"
              alt="TEJ FOOD PRODUCTS Logo"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover shadow-md ring-2 ring-amber-400/50 bg-[#08172E]"
            />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" title="Firebase लाइव सिंक एक्टिव"></span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-lg font-black tracking-tight text-white truncate max-w-[140px] sm:max-w-xs">
                {settings.companyName || 'TEJ FOOD PRODUCTS'}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {settings.brandName} आटा
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              <span className="truncate max-w-[120px] sm:max-w-xs">{settings.proprietor || settings.brandName}</span>
              <span className="text-emerald-400 font-semibold hidden sm:inline flex items-center gap-1">
                • 🔥 लाइव सिंक
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Live Mobile Server / Real-time Sync Button */}
          {onOpenLiveSync && (
            <button
              onClick={onOpenLiveSync}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                syncStatus === 'connected'
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
              }`}
              title="मोबाइल सर्वर एवं रियल-टाइम स्टाफ सिंक खोलें"
            >
              {syncDeviceRole === 'master' ? (
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Radio
                  className={`w-3.5 h-3.5 shrink-0 ${
                    syncStatus === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                  }`}
                />
              )}
              <span className="whitespace-nowrap hidden sm:inline">
                {syncStatus === 'connected'
                  ? `लाइव (${connectedDevicesCount})`
                  : 'सिंक...'}
              </span>
              <span className="whitespace-nowrap sm:hidden">
                {connectedDevicesCount}
              </span>
            </button>
          )}

          {/* Free App Install Button */}
          <button
            onClick={onOpenInstallModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition animate-pulse sm:animate-none"
            title="इस ऐप का फ्री वर्जन अपने फोन में इंस्टॉल करें"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span className="whitespace-nowrap hidden sm:inline">ऐप / API डाउनलोड</span>
            <span className="whitespace-nowrap sm:hidden">ऐप</span>
          </button>

          {/* Firebase Firestore Indicator (Desktop) */}
          <div 
            onClick={onOpenLiveSync || onOpenInstallModal}
            className="hidden xl:flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/60 px-2.5 py-1.5 rounded-lg border border-emerald-600/40 cursor-pointer hover:bg-emerald-950 transition"
            title="डेटा Firebase Firestore क्लाउड में सुरक्षित है और सभी मोबाइल पर रियल-टाइम सिंक होता है"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {syncStatus === 'connected' ? 'Firebase लाइव' : 'कनेक्टिंग...'}
            </span>
          </div>

          {/* Live Clock (Hidden on small mobile) */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-medium">{timeStr}</span>
          </div>

          {/* Low Stock Alert Button */}
          {lowStockCount > 0 && perms.viewInventory && (
            <button
              onClick={onNavigateToInventory}
              title={`${lowStockCount} आइटम्स का स्टॉक कम है`}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">स्टॉक अलर्ट</span>
              <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {lowStockCount}
              </span>
            </button>
          )}

          {/* Quick Action Buttons */}
          <div className="hidden md:flex items-center gap-1.5">
            {perms.viewOrders && (
              <button
                onClick={onOpenNewOrder}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition border border-slate-700"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                <span>+ ऑर्डर</span>
              </button>
            )}

            {perms.viewProduction && (
              <button
                onClick={onOpenNewProduction}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-lg transition"
              >
                <Factory className="w-3.5 h-3.5" />
                <span>+ पिसाई</span>
              </button>
            )}

            {perms.receivePayment && (
              <button
                onClick={onOpenReceivePayment}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>+ भुगतान</span>
              </button>
            )}
          </div>

          {/* Factory Settings Quick Button (Always visible on Mobile & Desktop for Admin/Authorized) */}
          {canManageSettings && onNavigateToSettings && (
            <button
              type="button"
              onClick={onNavigateToSettings}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isSettingsActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
              }`}
              title="फैक्ट्री का नाम, पता, बैंक खाता, UPI ID व सभी सेटिंग्स अपडेट करें"
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">सेटिंग्स</span>
            </button>
          )}

          {/* Role Simulator Switcher Button (Admin can switch; staff sees own badge) */}
          <button
            type="button"
            onClick={currentRole === 'admin' ? onOpenRoleSwitcher : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition ${
              currentRole === 'admin' ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
            } ${roleInfo.color}`}
            title={
              currentRole === 'admin'
                ? 'क्लिक करके किसी भी कर्मचारी का मोबाइल अकाउंट बदलें'
                : 'वर्तमान लॉग-इन खाता'
            }
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold hidden sm:inline">
              {currentUserName ? `${currentUserName} (${roleInfo.label})` : roleInfo.label}
            </span>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-bold transition cursor-pointer"
              title="लॉगआउट करें (Login Screen पर जाएं)"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">लॉगआउट</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
