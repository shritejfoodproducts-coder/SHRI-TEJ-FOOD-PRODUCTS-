import React, { useState, useEffect } from 'react';
import { UserRole, CompanySettings } from '../types/erp';
import { 
  Building2, 
  Smartphone, 
  Plus, 
  ShoppingCart, 
  Factory, 
  IndianRupee, 
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  HardDrive
} from 'lucide-react';
import { getDeviceStorageStats, LocalStorageStats } from '../utils/localStorageStats';

interface HeaderProps {
  currentRole: UserRole;
  settings: CompanySettings;
  lowStockCount: number;
  onOpenRoleSwitcher: () => void;
  onOpenNewOrder: () => void;
  onOpenNewProduction: () => void;
  onOpenReceivePayment: () => void;
  onNavigateToInventory: () => void;
  onOpenInstallModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  settings,
  lowStockCount,
  onOpenRoleSwitcher,
  onOpenNewOrder,
  onOpenNewProduction,
  onOpenReceivePayment,
  onNavigateToInventory,
  onOpenInstallModal,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [storageStats, setStorageStats] = useState<LocalStorageStats | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    setStorageStats(getDeviceStorageStats());
    const interval = setInterval(() => {
      updateTime();
      setStorageStats(getDeviceStorageStats());
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
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-md ring-2 ring-amber-300/30">
              T
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" title="लोकल स्टोरेज एक्टिव"></span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
                TEJ FOOD PRODUCTS
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {settings.brandName} आटा
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 font-medium">
              <span className="truncate max-w-[120px] sm:max-w-xs">{settings.companyName}</span>
              <span className="text-emerald-400 font-semibold hidden sm:inline flex items-center gap-1">
                • 📱 100% फ्री लोकल स्टोरेज
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Free App Install Button */}
          <button
            onClick={onOpenInstallModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition animate-pulse sm:animate-none"
            title="इस ऐप का फ्री वर्जन अपने फोन में इंस्टॉल करें"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span className="whitespace-nowrap">ऐप / API डाउनलोड</span>
          </button>

          {/* Local Storage Indicator (Desktop) */}
          <div 
            onClick={onOpenInstallModal}
            className="hidden xl:flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/60 px-2.5 py-1.5 rounded-lg border border-emerald-600/40 cursor-pointer hover:bg-emerald-950 transition"
            title="क्लाउड का उपयोग नहीं है, डेटा केवल आपके फोन में सुरक्षित है"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>फ़ोन मेमोरी: {storageStats?.usedFormatted || 'लोकल सुरक्षित'}</span>
          </div>

          {/* Live Clock (Hidden on small mobile) */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-medium">{timeStr}</span>
          </div>

          {/* Low Stock Alert Button */}
          {lowStockCount > 0 && (
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
            <button
              onClick={onOpenNewOrder}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition border border-slate-700"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
              <span>+ ऑर्डर</span>
            </button>

            <button
              onClick={onOpenNewProduction}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-lg transition"
            >
              <Factory className="w-3.5 h-3.5" />
              <span>+ पिसाई</span>
            </button>

            <button
              onClick={onOpenReceivePayment}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>+ भुगतान</span>
            </button>
          </div>

          {/* Role Simulator Switcher Button */}
          <button
            onClick={onOpenRoleSwitcher}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer hover:opacity-90 ${roleInfo.color}`}
            title="क्लिक करके किसी भी कर्मचारी का मोबाइल रोल बदलें"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold hidden sm:inline">{roleInfo.label}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
