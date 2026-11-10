import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types/erp';
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
  CheckCircle2,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  Save,
  RefreshCw
} from 'lucide-react';

interface StaffViewProps {
  staffList: UserProfile[];
  currentRole: UserRole;
  onAddStaff: (staff: UserProfile) => void;
  onUpdateStaff?: (staff: UserProfile) => void;
  onDeleteStaff?: (staffId: string) => void;
  onSwitchRole: (role: UserRole) => void;
}

export const StaffView: React.FC<StaffViewProps> = ({
  staffList,
  currentRole,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onSwitchRole,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<UserProfile | null>(null);
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);

  // New staff form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('packing_staff');
  const [password, setPassword] = useState('');
  const [shift, setShift] = useState('सुबह शिफ्ट (8 AM - 5 PM)');
  const [assignedVehicle, setAssignedVehicle] = useState('');

  // Edit staff form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('packing_staff');
  const [editPassword, setEditPassword] = useState('');
  const [editShift, setEditShift] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [showEditPass, setShowEditPass] = useState(false);

  const getRoleTitle = (r: UserRole) => {
    switch (r) {
      case 'admin': return 'मालिक (Admin)';
      case 'manager': return 'फैक्ट्री मैनेजर';
      case 'accountant': return 'अकाउंटेंट (मुनीम)';
      case 'store_keeper': return 'स्टोर कीपर (गोदाम)';
      case 'production_head': return 'प्रोडक्शन इंचार्ज';
      case 'packing_staff': return 'पैकिंग स्टाफ';
      case 'delivery_staff': return 'डिलीवरी स्टाफ (ड्राइवर)';
      default: return r;
    }
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const newStaff: UserProfile = {
      id: `staff-${Date.now()}`,
      name,
      phone,
      role,
      roleHindi: getRoleTitle(role),
      password: password || `${name.toLowerCase()}@tej123`,
      active: true,
      shift,
      assignedVehicle: role === 'delivery_staff' ? (assignedVehicle || 'महिंद्रा बोलेरो पिकअप RJ-14-GA-4521') : undefined,
      joinedDate: new Date().toISOString().slice(0, 10),
    };

    onAddStaff(newStaff);
    setShowAddModal(false);
    setName('');
    setPhone('');
    setPassword('');
  };

  const startEditStaff = (staff: UserProfile) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditPhone(staff.phone);
    setEditRole(staff.role);
    setEditPassword(staff.password || '');
    setEditShift(staff.shift || 'सुबह शिफ्ट (8 AM - 5 PM)');
    setEditVehicle(staff.assignedVehicle || '');
    setEditActive(staff.active);
    setShowEditPass(false);
  };

  const handleSaveEditStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !onUpdateStaff) return;

    const updated: UserProfile = {
      ...editingStaff,
      name: editName.trim(),
      phone: editPhone.trim(),
      role: editRole,
      roleHindi: getRoleTitle(editRole),
      password: editPassword.trim(),
      shift: editShift.trim(),
      assignedVehicle: editRole === 'delivery_staff' ? (editVehicle.trim() || 'महिंद्रा बोलेरो पिकअप RJ-14-GA-4521') : undefined,
      active: editActive,
    };

    onUpdateStaff(updated);
    setEditingStaff(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmStaff || !onDeleteStaff) return;
    onDeleteStaff(deleteConfirmStaff.id);
    setDeleteConfirmStaff(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-600" />
            <span>स्टाफ एवं मल्टी-मोबाइल लॉगिन मैनेजमेंट (Staff Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin व मैनेजर अधिकार, कर्मचारियों का नाम, मोबाइल नंबर, पासवर्ड एडिट व शिफ्ट रोस्टर
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ नया कर्मचारी जोड़ें</span>
        </button>
      </div>

      {/* Multi-Mobile Concept Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-black">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-300">
                Multi-Mobile Android ERP सिस्टम सक्रिय है
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                मालिक के मोबाइल पर पूरा बिज़नेस कंट्रोल रहेगा। यहाँ से आप किसी भी कर्मचारी का नाम, नंबर व पासवर्ड बदल सकते हैं।
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
            <span className="font-bold text-emerald-400 block">कुल एक्टिव कर्मचारी: {staffList.length}</span>
            <span className="text-[11px] text-slate-400">सभी के अलग-अलग लॉगिन क्रेडेंशियल्स सुरक्षित हैं</span>
          </div>
        </div>
      </div>

      {/* Staff Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((member) => {
          const isCurrent = currentRole === member.role;
          const showPass = showPasswordId === member.id;

          return (
            <div
              key={member.id}
              className={`bg-white rounded-2xl p-5 border-2 shadow-xs transition space-y-4 ${
                member.role === 'admin'
                  ? 'border-amber-400 bg-gradient-to-b from-amber-50/30 to-white'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      member.role === 'admin' 
                        ? 'bg-amber-500 text-slate-950 font-black' 
                        : member.role === 'manager'
                        ? 'bg-blue-600 text-white'
                        : member.role === 'accountant'
                        ? 'bg-emerald-600 text-white'
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

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEditStaff(member)}
                    className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg transition"
                    title="नाम, नंबर व पासवर्ड एडिट करें"
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
              </div>

              {/* Contact & Shift Info */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-medium">+91 {member.phone}</span>
                </p>
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

              {/* Login Credentials Box */}
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

              {/* Test Mobile View Button */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() => onSwitchRole(member.role)}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isCurrent
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isCurrent ? 'वर्तमान में यह मोबाइल रोल सक्रिय है' : 'इस कर्मचारी के मोबाइल में स्विच करें'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Staff Modal (Name, Phone, Password change) */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <span>कर्मचारी विवरण व पासवर्ड बदलें (Edit Staff)</span>
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
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    {editingStaff.role === 'admin' && <option value="admin">मालिक (Admin)</option>}
                    <option value="manager">मैनेजर</option>
                    <option value="accountant">अकाउंटेंट (मुनीम)</option>
                    <option value="store_keeper">स्टोर कीपर (गोदाम)</option>
                    <option value="production_head">प्रोडक्शन इंचार्ज</option>
                    <option value="packing_staff">पैकिंग स्टाफ</option>
                    <option value="delivery_staff">डिलीवरी ड्राइवर</option>
                  </select>
                </div>
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

      {/* Delete Staff Confirmation Modal */}
      {deleteConfirmStaff && (
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <span>नया कर्मचारी जोड़ें व ID बनाएँ</span>
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
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="manager">मैनेजर</option>
                    <option value="accountant">अकाउंटेंट (मुनीम)</option>
                    <option value="store_keeper">स्टोर कीपर (गोदाम)</option>
                    <option value="production_head">प्रोडक्शन इंचार्ज</option>
                    <option value="packing_staff">पैकिंग स्टाफ</option>
                    <option value="delivery_staff">डिलीवरी ड्राइवर</option>
                  </select>
                </div>
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
                  कर्मचारी ID सेव करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
