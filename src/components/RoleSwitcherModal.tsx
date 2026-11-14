import React from 'react';
import { UserRole, UserProfile } from '../types/erp';
import {
  PERMISSION_GROUPS,
  countEnabledPermissions,
  getEffectivePermissions,
} from '../utils/permissions';
import { X, Smartphone, Check, ShieldCheck, LogOut } from 'lucide-react';

interface RoleSwitcherModalProps {
  currentRole: UserRole;
  currentStaffId?: string;
  staffList: UserProfile[];
  onSelectRole: (role: UserRole) => void;
  onSelectUser?: (member: UserProfile) => void;
  onLogout?: () => void;
  onClose: () => void;
}

const getRoleBadgeColor = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'bg-amber-500 text-slate-950';
    case 'manager':
      return 'bg-blue-600 text-white';
    case 'accountant':
      return 'bg-emerald-600 text-white';
    case 'store_keeper':
      return 'bg-purple-600 text-white';
    case 'production_head':
      return 'bg-orange-600 text-white';
    case 'packing_staff':
      return 'bg-teal-600 text-white';
    case 'delivery_staff':
      return 'bg-indigo-600 text-white';
    case 'salesman':
      return 'bg-amber-600 text-white';
    default:
      return 'bg-slate-700 text-white';
  }
};

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  currentRole,
  currentStaffId,
  staffList,
  onSelectRole,
  onSelectUser,
  onLogout,
  onClose,
}) => {
  const allPermItems = PERMISSION_GROUPS.flatMap((g) => g.items);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">मोबाइल अकाउंट एवं अनुमति स्विचर (Staff Simulator)</h3>
              <p className="text-xs text-slate-300">
                Admin द्वारा दिए गए कस्टम अधिकारों के साथ किसी भी कर्मचारी के मोबाइल व्यू में जाएँ
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-3">
          {staffList.map((member) => {
            const effectivePerms = getEffectivePermissions(member, member.role);
            const enabledCount = countEnabledPermissions(effectivePerms);
            const isSelected = currentStaffId
              ? currentStaffId === member.id
              : currentRole === member.role;
            const badgeColor = getRoleBadgeColor(member.role);

            return (
              <div
                key={member.id}
                onClick={() => {
                  if (!member.active) return;
                  if (onSelectUser) {
                    onSelectUser(member);
                  } else {
                    onSelectRole(member.role);
                  }
                  onClose();
                }}
                className={`p-4 rounded-xl border-2 transition ${
                  !member.active
                    ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'border-amber-500 bg-amber-50/50 shadow-sm cursor-pointer'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${badgeColor}`}>
                      {member.roleHindi} — {member.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">+91 {member.phone}</span>
                    {member.email && (
                      <span className="text-[11px] text-slate-600 font-medium">• {member.email}</span>
                    )}
                    {!member.active && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        निष्क्रिय खाता
                      </span>
                    )}
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        वर्तमान एक्टिव अकाउंट
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {enabledCount}/15 अधिकार
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  {allPermItems.map((item) => {
                    const allowed = Boolean(effectivePerms[item.key]);
                    return (
                      <div key={item.key} className="flex items-center gap-1.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                            allowed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {allowed ? '✓' : '✕'}
                        </span>
                        <span className={allowed ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                          {item.labelHindi}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {onLogout && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">
              नए पासवर्ड से लॉगिन करने के लिए साइन आउट करें
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>लॉगआउट करें (Login Screen)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
