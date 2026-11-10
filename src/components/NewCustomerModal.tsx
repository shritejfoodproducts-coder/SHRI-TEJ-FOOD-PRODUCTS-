import React, { useState } from 'react';
import { Customer } from '../types/erp';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';

interface NewCustomerModalProps {
  onClose: () => void;
  onSubmit: (customer: Customer) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('जयपुर');
  const [gstin, setGstin] = useState('');
  const [type, setType] = useState<'retailer' | 'wholesaler' | 'caterer' | 'direct'>('retailer');
  const [creditLimit, setCreditLimit] = useState(50000);
  const [openingDue, setOpeningDue] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name,
      firmName: firmName || name,
      phone,
      address,
      city,
      gstin: gstin.toUpperCase(),
      type,
      totalOrders: 0,
      totalPurchased: openingDue,
      totalPaid: 0,
      currentDue: openingDue,
      creditLimit: Number(creditLimit) || 50000,
      lastOrderDate: new Date().toISOString().slice(0, 10),
    };

    onSubmit(newCustomer);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-200" />
            <h3 className="font-bold text-base">नया ग्राहक / फर्म जोड़ें (Add Customer)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">दुकान / फर्म का नाम *</label>
              <input
                type="text"
                required
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="उदा. श्री श्याम किराना स्टोर्स"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">व्यापारी / संपर्क व्यक्ति *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="उदा. मदनलाल जी"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">मोबाइल नंबर (WhatsApp) *</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98290XXXXX"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">ग्राहक प्रकार *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="retailer">किराना दुकानदार (Retailer)</option>
                <option value="wholesaler">होलसेलर / मंडी आढ़तिया (Wholesaler)</option>
                <option value="caterer">हलवाई / कैटरर्स / होटल (Caterer)</option>
                <option value="direct">सीधा ग्राहक (Direct Consumer)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">दुकान का पूरा पता *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="दुकान नं., बाजार का नाम, लैंडमार्क"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">शहर / कस्बा *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN नंबर (वैकल्पिक)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="08XXXXX0000X1ZX"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">उधार सीमा / Credit Limit (₹)</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">पुरानी बकाया राशि (Opening Due ₹)</label>
              <input
                type="number"
                value={openingDue}
                onChange={(e) => setOpeningDue(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-rose-600 font-bold"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-100 font-semibold"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ग्राहक खाता खोलें</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
