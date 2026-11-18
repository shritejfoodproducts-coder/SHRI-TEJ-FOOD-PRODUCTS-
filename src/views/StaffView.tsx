import React, { useState } from 'react';
import { CommissionType, Customer, Order, StaffPermissions, UserProfile, UserRole } from '../types/erp';
import { formatCommissionRuleHindi, resolveOrderCommission } from '../../shared/commission';
import {
  ALL_TRUE_PERMISSIONS,
  PERMISSION_GROUPS,
  countEnabledPermissions,
  getDefaultPermissionsForRole,
  getEffectivePermissions,
} from '../utils/permissions';
import { 
  UserCheck, 
  UserPlus, 
  ShieldCheck, 
  Smartphone, 
  Key, 
  Eye, 
  EyeOff, 
  Phone, 
  Clock, 
  Truck,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  Save,
  RefreshCw,
  Lock,
  Sliders,
  CheckSquare,
  Mail,
  Briefcase
} from 'lucide-react';

interface StaffViewProps {
  staffList: UserProfile[];
  customers?: Customer[];
  orders?: Order[];
  currentRole: UserRole;
  currentStaffId?: string;
  canManageStaff: boolean;
  onAddStaff: (staff: UserProfile) => void;
  onUpdateStaff?: (staff: UserProfile) => void;
  onDeleteStaff?: (staffId: string) => void;
  onSwitchRole: (role: UserRole) => void;
  onSelectStaffMember?: (member: UserProfile) => void;
  onOpenSalesmanLedger?: (salesmanId: string) => void;
}

export const StaffView: React.FC<StaffViewProps> = ({
  staffList,
  customers = [],
  orders = [],
  currentRole,
  currentStaffId,
  canManageStaff,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onSwitchRole,
  onSelectStaffMember,
  onOpenSalesmanLedger,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [permissionsModalStaff, setPermissionsModalStaff] = useState<UserProfile | null>(null);
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<UserProfile | null>(null);
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);

  // New staff form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('packing_staff');
  const [password, setPassword] = useState('');
  const [shift, setShift] = useState('सुबह शिफ्ट (8 AM - 5 PM)');
  const [assignedVehicle, setAssignedVehicle] = useState('');
  const [baseSalary, setBaseSalary] = useState<number>(15000);
  const [commissionType, setCommissionType] = useState<CommissionType>('percent');
  const [commissionRate, setCommissionRate] = useState<number>(2);
  const [newPermissions, setNewPermissions] = useState<StaffPermissions>(
    getDefaultPermissionsForRole('packing_staff')
  );

  // Edit staff form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('packing_staff');
  const [editPassword, setEditPassword] = useState('');
  const [editShift, setEditShift] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editBaseSalary, setEditBaseSalary] = useState<number>(15000);
  const [editCommissionType, setEditCommissionType] = useState<CommissionType>('percent');
  const [editCommissionRate, setEditCommissionRate] = useState<number>(2);
  const [showEditPass, setShowEditPass] = useState(false);
  const [editPermissions, setEditPermissions] = useState<StaffPermissions>(
    getDefaultPermissionsForRole('packing_staff')
  );

  // Quick Permissions modal state
  const [quickPermissions, setQuickPermissions] = useState<StaffPermissions>(
    getDefaultPermissionsForRole('packing_staff')
  );

  const getRoleTitle = (r: UserRole) => {
    switch (r) {
      case 'admin': return 'मालिक (Admin)';
      case 'manager': return 'फैक्ट्री मैनेजर';
      case 'accountant': return 'अकाउंटेंट (मुनीम)';
      case 'store_keeper': return 'स्टोर कीपर (गोदाम)';
      case 'production_head': return 'प्रोडक्शन इंचार्ज';
      case 'packing_staff': return 'पैकिंग स्टाफ';
      case 'delivery_staff': return 'डिलीवरी स्टाफ (ड्राइवर)';
      case 'salesman': return 'सेल्समैन (मार्केट बुकिंग व वसूली)';
      default: return r;
    }
  };

  const handleOpenAddModal = () => {
    if (!canManageStaff) return;
    setName('');
    setPhone('');
    setEmail('');
    setRole('packing_staff');
    setPassword('');
    setShift('सुबह शिफ्ट (8 AM - 5 PM)');
    setAssignedVehicle('');
    setBaseSalary(15000);
    setCommissionType('percent');
    setCommissionRate(2);
    setNewPermissions(getDefaultPermissionsForRole('packing_staff'));
    setShowAddModal(true);
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageStaff) return;
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const newStaff: UserProfile = {
      id: `staff-${Date.now()}`,
      name: cleanName,
      phone: phone.trim(),
      email: cleanEmail ? cleanEmail : undefined,
      role,
      roleHindi: getRoleTitle(role),
      password: password.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '')}@tej123`,
      active: true,
      shift: shift.trim(),
      assignedVehicle: role === 'delivery_staff' ? (assignedVehicle.trim() || 'महिंद्रा बोलेरो पिकअप RJ-14-GA-4521') : undefined,
      joinedDate: new Date().toISOString().slice(0, 10),
      permissions: role === 'admin' ? { ...ALL_TRUE_PERMISSIONS } : { ...newPermissions },
      ...(role === 'salesman'
        ? {
            baseSalary: Math.max(0, Number(baseSalary) || 0),
            commissionType,
            commissionRate: Math.max(0, Number(commissionRate) || 0),
          }
        : {}),
    };

    onAddStaff(newStaff);
    setShowAddModal(false);
  };

  const startEditStaff = (staff: UserProfile) => {
    if (!canManageStaff) return;
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditPhone(staff.phone);
    setEditEmail(staff.email || '');
    setEditRole(staff.role);
    setEditPassword(staff.password || '');
    setEditShift(staff.shift || 'सुबह शिफ्ट (8 AM - 5 PM)');
    setEditVehicle(staff.assignedVehicle || '');
    setEditActive(staff.active);
    setEditBaseSalary(staff.baseSalary ?? 15000);
    setEditCommissionType(staff.commissionType || 'percent');
    setEditCommissionRate(staff.commissionRate ?? 2);
    setShowEditPass(false);
    setEditPermissions(getEffectivePermissions(staff, staff.role));
  };

  const handleSaveEditStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !onUpdateStaff || !canManageStaff) return;
    const cleanEditEmail = editEmail.trim();

    const updated: UserProfile = {
      ...editingStaff,
      name: editName.trim(),
      phone: editPhone.trim(),
      email: cleanEditEmail ? cleanEditEmail : undefined,
      role: editRole,
      roleHindi: getRoleTitle(editRole),
      password: editPassword.trim(),
      shift: editShift.trim(),
      assignedVehicle: editRole === 'delivery_staff' ? (editVehicle.trim() || 'महिंद्रा बोलेरो पिकअप RJ-14-GA-4521') : undefined,
      active: editActive,
      permissions: editRole === 'admin' ? { ...ALL_TRUE_PERMISSIONS } : { ...editPermissions },
      ...(editRole === 'salesman'
        ? {
            baseSalary: Math.max(0, Number(editBaseSalary) || 0),
            commissionType: editCommissionType,
            commissionRate: Math.max(0, Number(editCommissionRate) || 0),
          }
        : {}),
    };

    onUpdateStaff(updated);
    setEditingStaff(null);
  };

  const openPermissionsModal = (staff: UserProfile) => {
    if (!canManageStaff) return;
    setPermissionsModalStaff(staff);
    setQuickPermissions(getEffectivePermissions(staff, staff.role));
  };

  const handleSaveQuickPermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionsModalStaff || !onUpdateStaff || !canManageStaff) return;
    const updated: UserProfile = {
      ...permissionsModalStaff,
      permissions: permissionsModalStaff.role === 'admin' ? { ...ALL_TRUE_PERMISSIONS } : { ...quickPermissions },
    };
    onUpdateStaff(updated);
    setPermissionsModalStaff(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmStaff || !onDeleteStaff || !canManageStaff) return;
    onDeleteStaff(deleteConfirmStaff.id);
    setDeleteConfirmStaff(null);
  };

  const renderPermissionMatrix = (
    perms: StaffPermissions,
    setPerms: (next: StaffPermissions) => void,
    targetRole: UserRole
  ) => {
    const isTargetAdmin = targetRole === 'admin';
    const enabledCount = countEnabledPermissions(perms);

    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div>
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>मॉड्यूल एवं कार्य अनुमतियां (Admin Permissions)</span>
            </h4>
            <p className="text-[10px] text-slate-500">
              चुनें कि यह कर्मचारी अपने मोबाइल पर क्या-क्या देख और एडिट कर सकेगा ({enabledCount}/15 सक्रिय)
            </p>
          </div>

          {!isTargetAdmin && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPerms(getDefaultPermissionsForRole(targetRole))}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold text-slate-700"
              >
                रोल डिफ़ॉल्ट
              </button>
              <button
                type="button"
                onClick={() => setPerms({ ...ALL_TRUE_PERMISSIONS })}
                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg text-[10px] font-bold text-amber-900 flex items-center gap-1"
              >
                <CheckSquare className="w-3 h-3" />
                <span>सभी चुनें</span>
              </button>
            </div>
          )}
        </div>

        {isTargetAdmin ? (
          <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 font-semibold">
            मालिक (Admin) के पास हमेशा सभी 15/15 मॉड्यूल और सुरक्षा अधिकार सक्रिय रहते हैं।
          </div>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.groupTitle} className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {group.groupTitle}
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {group.items.map((item) => {
                    const checked = Boolean(perms[item.key]);
                    const isCritical = item.key === 'manageStaff' || item.key === 'manageSettings';
                    return (
                      <label
                        key={item.key}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                          checked
                            ? isCritical
                              ? 'bg-amber-50 border-amber-400'
                              : 'bg-white border-emerald-300 shadow-2xs'
                            : 'bg-slate-100/60 border-slate-200 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setPerms({
                              ...perms,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-[11px]">
                              {item.labelHindi}
                            </span>
                            {isCritical && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded">
                                ADMIN LEVEL
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {item.description}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-600" />
            <span>स्टाफ एवं अधिकार मैनेजमेंट (Staff & Permissions)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            केवल मालिक (Admin) या अधिकृत यूज़र ही नया स्टाफ जोड़, एडिट और किसको क्या अनुमति (Permissions) देनी है तय कर सकते हैं
          </p>
        </div>

        {canManageStaff && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ नया कर्मचारी जोड़ें</span>
          </button>
        )}
      </div>

      {/* Admin Only Protection Notice when viewed without permission */}
      {!canManageStaff && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-950">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">केवल Admin / अधिकृत अधिकार (View Only)</h4>
            <p className="text-amber-800 mt-0.5">
              नया स्टाफ जोड़ने, विवरण/पासवर्ड एडिट करने या किसी कर्मचारी को मॉड्यूल अधिकार (Permissions) देने का कंट्रोल केवल मालिक (Admin) के पास सुरक्षित है।
            </p>
          </div>
        </div>
      )}

      {/* Multi-Mobile Concept Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-black">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-300">
                Admin कस्टम स्टाफ अधिकार नियंत्रण सक्रिय है
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                मालिक जिसे चाहें उसे स्टाफ एडिट, ऑर्डर एडिट, पिसाई एडिट, बकाया वसूली या रिपोर्ट की अनुमति दे सकते हैं।
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
            <span className="font-bold text-emerald-400 block">कुल एक्टिव कर्मचारी: {staffList.length}</span>
            <span className="text-[11px] text-slate-400">प्रत्येक स्टाफ की अपनी कस्टम अनुमतियां सुरक्षित हैं</span>
          </div>
        </div>
      </div>

      {/* Staff Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((member) => {
          const isCurrent = currentStaffId ? currentStaffId === member.id : currentRole === member.role;
          const showPass = showPasswordId === member.id;
          const effectivePerms = getEffectivePermissions(member, member.role);
          const enabledPermCount = countEnabledPermissions(effectivePerms);

          return (
            <div
              key={member.id}
              className={`bg-white rounded-2xl p-5 border-2 shadow-xs transition space-y-4 ${
                member.role === 'admin'
                  ? 'border-amber-400 bg-gradient-to-b from-amber-50/30 to-white'
                  : isCurrent
                  ? 'border-emerald-400'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      member.role === 'admin' 
                        ? 'bg-amber-500 text-slate-950 font-black' 
                        : member.role === 'manager'
                        ? 'bg-blue-600 text-white'
                        : member.role === 'accountant'
                        ? 'bg-emerald-600 text-white'
                        : member.role === 'salesman'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {member.roleHindi}
                    </span>
                    {!member.active && (
                      <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.2 rounded font-bold">
                        निष्क्रिय
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-1.5">
                    {member.name}
                  </h3>
                </div>

                {/* Admin-only Edit & Delete Action Buttons */}
                {canManageStaff && (
                  <div className="flex items-center gap-1 shrink-0">
                    {member.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => openPermissionsModal(member)}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition"
                        title="इस कर्मचारी के अधिकार (Permissions) बदलें"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => startEditStaff(member)}
                      className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg transition"
                      title="नाम, नंबर, पासवर्ड व अधिकार एडिट करें"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    </button>

                    {member.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmStaff(member)}
                        className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-lg transition"
                        title="कर्मचारी को हटाएं"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Contact & Shift Info */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-medium">+91 {member.phone}</span>
                </p>
                {member.email && (
                  <p className="flex items-center gap-2 break-all">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">{member.email}</span>
                  </p>
                )}
                {member.shift && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{member.shift}</span>
                  </p>
                )}
                {member.assignedVehicle && (
                  <p className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-purple-700 font-bold">{member.assignedVehicle}</span>
                  </p>
                )}
              </div>

              {/* Salesman Field, Salary & Commission Summary */}
              {member.role === 'salesman' && (() => {
                const curMonth = new Date().toISOString().slice(0, 7);
                const linkedCusts = customers.filter((c) => c.salesmanId === member.id);
                const linkedCustIds = new Set(linkedCusts.map((c) => c.id));
                const monthOrders = orders.filter(
                  (o) =>
                    o.status !== 'cancelled' &&
                    o.date.startsWith(curMonth) &&
                    (o.salesmanId === member.id || (!o.salesmanId && linkedCustIds.has(o.customerId)))
                );
                const monthAmount = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
                const deliveredComm = monthOrders.reduce(
                  (s, o) => s + resolveOrderCommission(o, member).creditedAmount,
                  0
                );
                const baseSal = member.baseSalary || 0;

                return (
                  <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-2.5 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                        <span>सेल्समैन फील्ड (इस माह)</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        ₹{monthAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-amber-900">
                      <span>जोड़े ग्राहक: <strong>{linkedCusts.length}</strong></span>
                      <span>इस माह ऑर्डर: <strong>{monthOrders.length}</strong></span>
                    </div>
                    <div className="pt-1 border-t border-amber-200/80 space-y-0.5 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">मूल वेतन + डिलीवर कमीशन:</span>
                        <span className="font-mono font-black text-emerald-800">
                          ₹{(baseSal + deliveredComm).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between text-amber-800">
                        <span>नियम: {formatCommissionRuleHindi(member)}</span>
                        <span className="font-mono font-bold">+₹{deliveredComm.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    {onOpenSalesmanLedger && (
                      <button
                        type="button"
                        onClick={() => onOpenSalesmanLedger(member.id)}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition"
                      >
                        फील्ड लेखा व सैलरी/कमीशन खोलें
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Permission Summary Badge */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block">
                      {enabledPermCount}/15 अधिकार सक्रिय
                    </span>
                    {effectivePerms.manageStaff && member.role !== 'admin' && (
                      <span className="text-[10px] text-amber-700 font-bold block">
                        ★ स्टाफ एडिट व अधिकार प्राप्त
                      </span>
                    )}
                  </div>
                </div>

                {canManageStaff && member.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => openPermissionsModal(member)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-[10px] font-bold shrink-0"
                  >
                    अधिकार बदलें
                  </button>
                )}
              </div>

              {/* Login Credentials Box */}
              {canManageStaff && (
                <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">पासवर्ड (Password):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {showPass ? member.password : '••••••••'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordId(showPass ? null : member.id)}
                      className="p-1 text-slate-500 hover:text-slate-800"
                      title={showPass ? 'पासवर्ड छुपाएं' : 'पासवर्ड देखें'}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditStaff(member)}
                      className="text-[11px] text-amber-700 hover:text-amber-800 font-bold underline"
                    >
                      बदलें
                    </button>
                  </div>
                </div>
              )}

              {/* Test Mobile View Button */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() =>
                    onSelectStaffMember ? onSelectStaffMember(member) : onSwitchRole(member.role)
                  }
                  className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isCurrent
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isCurrent ? 'वर्तमान में यह अकाउंट सक्रिय है' : 'इस कर्मचारी के मोबाइल में स्विच करें'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Staff Modal (Name, Phone, Password, Permissions change - Admin Only) */}
      {canManageStaff && editingStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 text-xs text-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <span>कर्मचारी विवरण, पासवर्ड व अधिकार बदलें (Edit Staff)</span>
              </h3>
              <button 
                onClick={() => setEditingStaff(null)} 
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">कर्मचारी का नाम (Staff Name) *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">मोबाइल नंबर (Phone) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">पद (Role) *</label>
                  <select
                    value={editRole}
                    disabled={editingStaff.role === 'admin'}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setEditRole(nextRole);
                      setEditPermissions(getDefaultPermissionsForRole(nextRole));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    {editingStaff.role === 'admin' && <option value="admin">मालिक (Admin)</option>}
                    <option value="manager">मैनेजर</option>
                    <option value="accountant">अकाउंटेंट (मुनीम)</option>
                    <option value="store_keeper">स्टोर कीपर (गोदाम)</option>
                    <option value="production_head">प्रोडक्शन इंचार्ज</option>
                    <option value="packing_staff">पैकिंग स्टाफ</option>
                    <option value="delivery_staff">डिलीवरी ड्राइवर</option>
                    <option value="salesman">सेल्समैन (मार्केट बुकिंग व वसूली)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ईमेल पता (Email - वैकल्पिक)</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="उदा. staff@shritejfood.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Password field with Show/Hide toggle */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">लॉगिन पासवर्ड (Password) *</label>
                  <button
                    type="button"
                    onClick={() => setEditPassword(`tej${Math.floor(100 + Math.random() * 900)}@${editName.slice(0, 3).toLowerCase()}`)}
                    className="text-[10px] text-amber-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>नया पासवर्ड सुझाएं</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPass ? 'text' : 'password'}
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPass(!showEditPass)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800"
                  >
                    {showEditPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  कर्मचारी इसी पासवर्ड से अपने Android फोन से लॉगिन कर सकेगा।
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ड्यूटी शिफ्ट</label>
                  <input
                    type="text"
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">गाड़ी नंबर (यदि ड्राइवर)</label>
                  <input
                    type="text"
                    value={editVehicle}
                    onChange={(e) => setEditVehicle(e.target.value)}
                    placeholder="RJ-14-GA-4521"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              {editingStaff.role !== 'admin' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="edit-active"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <label htmlFor="edit-active" className="text-xs font-bold text-slate-700 cursor-pointer">
                    कर्मचारी खाता सक्रिय (Active) रखें
                  </label>
                </div>
              )}

              {editRole === 'salesman' && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2.5">
                  <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-amber-700" />
                    <span>सेल्समैन सैलरी व डिलीवरी कमीशन सेटिंग (Salary & Commission)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">मूल मासिक सैलरी (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={editBaseSalary}
                        onChange={(e) => setEditBaseSalary(Number(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">कमीशन प्रकार</label>
                      <select
                        value={editCommissionType}
                        onChange={(e) => setEditCommissionType(e.target.value as CommissionType)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-semibold"
                      >
                        <option value="percent">बिल राशि का प्रतिशत (%)</option>
                        <option value="per_bag">प्रति बैग कमीशन (₹/बैग)</option>
                        <option value="fixed_per_order">प्रति डिलीवर्ड ऑर्डर (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {editCommissionType === 'percent'
                          ? 'कमीशन दर (%)'
                          : editCommissionType === 'per_bag'
                          ? 'प्रति बैग राशि (₹)'
                          : 'प्रति ऑर्डर राशि (₹)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editCommissionRate}
                        onChange={(e) => setEditCommissionRate(Number(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-900">
                    ऑर्डर का स्टेटस <strong>Delivered</strong> होते ही यह कमीशन अपने-आप सेल्समैन की सैलरी में जुड़ जाएगा।
                  </p>
                </div>
              )}

              {/* Granular Permission Controls */}
              {renderPermissionMatrix(editPermissions, setEditPermissions, editRole)}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-100"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>बदलाव सुरक्षित करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Manage Permissions Modal (Admin Only) */}
      {canManageStaff && permissionsModalStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 text-xs text-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-600" />
                  <span>अनुमतियां सेट करें: {permissionsModalStaff.name}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  पद: {permissionsModalStaff.roleHindi} • +91 {permissionsModalStaff.phone}
                </p>
              </div>
              <button
                onClick={() => setPermissionsModalStaff(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPermissions} className="space-y-4">
              {renderPermissionMatrix(
                quickPermissions,
                setQuickPermissions,
                permissionsModalStaff.role
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPermissionsModalStaff(null)}
                  className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-100"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>अधिकार सेव करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {canManageStaff && deleteConfirmStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-slate-900">
              कर्मचारी को हटाना चाहते हैं?
            </h3>
            
            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              क्या आप सचमुच <strong>{deleteConfirmStaff.name}</strong> ({deleteConfirmStaff.roleHindi}) का लॉगिन खाता हमेशा के लिए हटाना चाहते हैं?
            </p>

            <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmStaff(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
              >
                हाँ, हटाएँ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal (Admin Only) */}
      {canManageStaff && showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 text-xs text-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <span>नया कर्मचारी जोड़ें, ID व अधिकार सेट करें</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">कर्मचारी का नाम *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="उदा. गोपाल सिंह"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">मोबाइल नंबर *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">पद (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setRole(nextRole);
                      setNewPermissions(getDefaultPermissionsForRole(nextRole));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="manager">मैनेजर</option>
                    <option value="accountant">अकाउंटेंट (मुनीम)</option>
                    <option value="store_keeper">स्टोर कीपर (गोदाम)</option>
                    <option value="production_head">प्रोडक्शन इंचार्ज</option>
                    <option value="packing_staff">पैकिंग स्टाफ</option>
                    <option value="delivery_staff">डिलीवरी ड्राइवर</option>
                    <option value="salesman">सेल्समैन (मार्केट बुकिंग व वसूली)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ईमेल पता (Email - वैकल्पिक)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="उदा. gopal@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">लॉगिन पासवर्ड *</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="उदा. gopal@tej786"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ड्यूटी शिफ्ट</label>
                  <input
                    type="text"
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">गाड़ी नंबर (यदि ड्राइवर)</label>
                  <input
                    type="text"
                    value={assignedVehicle}
                    onChange={(e) => setAssignedVehicle(e.target.value)}
                    placeholder="RJ-14-GA-4521"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              {role === 'salesman' && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2.5">
                  <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-amber-700" />
                    <span>सेल्समैन सैलरी व कमीशन सेटिंग (Salary & Commission)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">मूल मासिक सैलरी (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={baseSalary}
                        onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">कमीशन प्रकार</label>
                      <select
                        value={commissionType}
                        onChange={(e) => setCommissionType(e.target.value as CommissionType)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-semibold"
                      >
                        <option value="percent">बिल राशि का प्रतिशत (%)</option>
                        <option value="per_bag">प्रति बैग कमीशन (₹/बैग)</option>
                        <option value="fixed_per_order">प्रति डिलीवर्ड ऑर्डर (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {commissionType === 'percent'
                          ? 'कमीशन दर (%)'
                          : commissionType === 'per_bag'
                          ? 'प्रति बैग राशि (₹)'
                          : 'प्रति ऑर्डर राशि (₹)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(Number(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-900">
                    ऑर्डर डिलीवर (Delivered) होने के बाद यह कमीशन अपने-आप सेल्समैन की सैलरी में जुड़ेगा।
                  </p>
                </div>
              )}

              {/* Granular Permission Controls */}
              {renderPermissionMatrix(newPermissions, setNewPermissions, role)}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  कर्मचारी ID व अधिकार सेव करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
