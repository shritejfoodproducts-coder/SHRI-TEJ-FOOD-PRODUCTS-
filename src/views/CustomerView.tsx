import React, { useState } from 'react';
import { Customer, Order, CompanySettings } from '../types/erp';
import { 
  Users, 
  UserPlus, 
  IndianRupee, 
  Phone, 
  MapPin, 
  Share2, 
  Search, 
  Filter, 
  ArrowUpRight,
  FileText,
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit3,
  Trash2,
  AlertTriangle,
  Save,
  X
} from 'lucide-react';

interface CustomerViewProps {
  customers: Customer[];
  orders: Order[];
  settings: CompanySettings;
  onOpenNewCustomer: () => void;
  onOpenReceivePayment: (customerId?: string) => void;
  onSelectOrder: (order: Order) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customers,
  orders,
  settings,
  onOpenNewCustomer,
  onOpenReceivePayment,
  onSelectOrder,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFirmName, setEditFirmName] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editType, setEditType] = useState<'retailer' | 'wholesaler' | 'caterer' | 'direct'>('retailer');
  const [editGstin, setEditGstin] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState<number>(50000);
  const [editCurrentDue, setEditCurrentDue] = useState<number>(0);

  // Delete Customer Confirmation State
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<Customer | null>(null);

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.firmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'dues') return c.currentDue > 0;
    if (filterType === 'retailer') return c.type === 'retailer';
    if (filterType === 'wholesaler') return c.type === 'wholesaler';
    if (filterType === 'caterer') return c.type === 'caterer';

    return true;
  });

  const totalDues = customers.reduce((s, c) => s + c.currentDue, 0);
  const totalPurchases = customers.reduce((s, c) => s + c.totalPurchased, 0);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const customerOrders = orders.filter(o => o.customerId === selectedCustomerId);

  // WhatsApp reminder message
  const handleSendReminder = (customer: Customer) => {
    const msg = `*श्री ${customer.name} जी* (${customer.firmName})%0A` +
      ` सादर प्रणाम! 🙏%0A%0A` +
      `*${settings.companyName}* (${settings.brandName} आटा) की ओर से आपका खाता विवरण:%0A` +
      `💰 *वर्तमान बकाया राशि*: ₹${customer.currentDue.toLocaleString('en-IN')}%0A%0A` +
      `कृपया शेष राशि का भुगतान शीघ्र अति शीघ्र निम्नलिखित बैंक खाते या UPI पर करने की कृपा करें:%0A` +
      `🏦 *बैंक*: ${settings.bankName}%0A` +
      `A/C No: ${settings.accountNumber}%0A` +
      `IFSC: ${settings.ifscCode}%0A` +
      `📱 *UPI ID*: ${settings.upiId}%0A%0A` +
      `धन्यवाद! 🙏%0A*${settings.companyName}* - फोन: ${settings.phone}`;

    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://api.whatsapp.com/send?phone=${phoneParam}&text=${msg}`, '_blank');
  };

  const startEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditFirmName(cust.firmName);
    setEditName(cust.name);
    setEditPhone(cust.phone);
    setEditAddress(cust.address);
    setEditCity(cust.city);
    setEditType(cust.type);
    setEditGstin(cust.gstin || '');
    setEditCreditLimit(cust.creditLimit);
    setEditCurrentDue(cust.currentDue);
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !onUpdateCustomer) return;

    const updated: Customer = {
      ...editingCustomer,
      firmName: editFirmName.trim(),
      name: editName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      city: editCity.trim(),
      type: editType,
      gstin: editGstin.trim() ? editGstin.trim().toUpperCase() : undefined,
      creditLimit: Number(editCreditLimit) || 0,
      currentDue: Number(editCurrentDue) || 0,
    };

    onUpdateCustomer(updated);
    setEditingCustomer(null);
  };

  const handleConfirmDeleteCustomer = () => {
    if (!deleteConfirmCustomer || !onDeleteCustomer) return;
    onDeleteCustomer(deleteConfirmCustomer.id);
    if (selectedCustomerId === deleteConfirmCustomer.id) {
      setSelectedCustomerId(null);
    }
    setDeleteConfirmCustomer(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            <span>ग्राहक खाता प्रबंधन (Customer Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            किराना दुकानदार, होलसेल मंडी आढ़तिया, कैटरर्स खाता, ग्राहक एडिट, डिलीट एवं बकाया उधारी नियंत्रण
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenReceivePayment()}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <IndianRupee className="w-4 h-4" />
            <span>भुगतान प्राप्त करें</span>
          </button>

          <button
            onClick={onOpenNewCustomer}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ नया ग्राहक जोड़ें</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">मार्केट में कुल बकाया (Total Dues)</span>
          <span className="font-mono font-black text-2xl text-rose-600 block mt-1">
            ₹{totalDues.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500">
            {customers.filter(c => c.currentDue > 0).length} ग्राहकों से वसूली बाकी है
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">कुल पंजीकृत ग्राहक</span>
          <span className="font-mono font-black text-2xl text-slate-900 block mt-1">
            {customers.length}
          </span>
          <span className="text-[11px] text-slate-500">
            दुकानदार, आढ़तिया व कैटरर्स
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">कुल लाइफटाइम बिक्री</span>
          <span className="font-mono font-black text-2xl text-emerald-700 block mt-1">
            ₹{totalPurchases.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500">
            सभी ग्राहकों की कुल खरीदारी
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="नाम, दुकान, शहर या मोबाइल नंबर खोजें..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            सभी ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('dues')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'dues'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            केवल बकायादार ({customers.filter(c => c.currentDue > 0).length})
          </button>
          <button
            onClick={() => setFilterType('retailer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'retailer'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            किराना
          </button>
          <button
            onClick={() => setFilterType('wholesaler')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'wholesaler'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            होलसेलर
          </button>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">फर्म व व्यापारी</th>
                <th className="py-3 px-3">संपर्क व पता</th>
                <th className="py-3 px-3 text-center">प्रकार</th>
                <th className="py-3 px-3 text-right">कुल खरीद</th>
                <th className="py-3 px-3 text-right">वर्तमान बकाया (Due)</th>
                <th className="py-3 px-3 text-right">उधार सीमा</th>
                <th className="py-3 px-4 text-center">कार्रवाई (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((cust) => {
                const isOverLimit = cust.currentDue > cust.creditLimit;

                return (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 text-sm">
                          {cust.firmName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">
                            {cust.firmName}
                          </span>
                          <span className="text-[11px] text-slate-600 font-medium">
                            श्री {cust.name} {cust.gstin ? `• GST: ${cust.gstin}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-slate-600 space-y-0.5">
                        <p className="flex items-center gap-1 font-mono font-medium text-slate-900">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>+91 {cust.phone}</span>
                        </p>
                        <p className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{cust.address}, {cust.city}</span>
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cust.type === 'wholesaler' 
                          ? 'bg-blue-100 text-blue-800' 
                          : cust.type === 'retailer'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {cust.type.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                      ₹{cust.totalPurchased.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <span className={`font-black text-sm block ${
                        cust.currentDue > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}>
                        ₹{cust.currentDue.toLocaleString('en-IN')}
                      </span>
                      {isOverLimit && (
                        <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded-sm font-bold">
                          सीमा पार!
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      ₹{cust.creditLimit.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {cust.currentDue > 0 && (
                          <button
                            onClick={() => handleSendReminder(cust)}
                            title="WhatsApp पर बकाया तगादा भेजें"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onOpenReceivePayment(cust.id)}
                          title="भुगतान दर्ज करें"
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-bold transition"
                        >
                          वसूलें
                        </button>

                        <button
                          onClick={() => setSelectedCustomerId(cust.id)}
                          title="बिलिंग इतिहास देखें"
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                        >
                          लेजर
                        </button>

                        {/* Edit Customer Button */}
                        <button
                          type="button"
                          onClick={() => startEditCustomer(cust)}
                          title="ग्राहक विवरण एडिट करें"
                          className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 rounded-lg transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                        </button>

                        {/* Delete Customer Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmCustomer(cust)}
                          title="ग्राहक को खाता सूची से हटाएं"
                          className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-700 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <span>ग्राहक विवरण व खाता एडिट करें (Edit Customer)</span>
              </h3>
              <button onClick={() => setEditingCustomer(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">दुकान / फर्म का नाम *</label>
                  <input
                    type="text"
                    required
                    value={editFirmName}
                    onChange={(e) => setEditFirmName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">व्यापारी / मालिक का नाम *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">मोबाइल नंबर (10 अंक) *</label>
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
                  <label className="block font-bold text-slate-700 mb-1">ग्राहक श्रेणी (Customer Type) *</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="retailer">किराना स्टोर (Retailer)</option>
                    <option value="wholesaler">होलसेल मंडी आढ़तिया (Wholesaler)</option>
                    <option value="caterer">हलवाई व कैटरर्स (Caterer)</option>
                    <option value="direct">सीधा उपभोक्ता (Direct)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">दुकान का पता (Address) *</label>
                  <input
                    type="text"
                    required
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">शहर / कस्बा *</label>
                  <input
                    type="text"
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN (वैकल्पिक)</label>
                  <input
                    type="text"
                    value={editGstin}
                    onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                    placeholder="08XXXXX..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">उधार सीमा (Credit Limit ₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-rose-700 mb-1">वर्तमान बकाया (Due ₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editCurrentDue}
                    onChange={(e) => setEditCurrentDue(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-rose-50 border border-rose-300 rounded-xl font-mono font-bold text-rose-800"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-100"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>ग्राहक जानकारी सुरक्षित करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {deleteConfirmCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-slate-900">
              ग्राहक खाता डिलीट करें?
            </h3>
            
            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              क्या आप सचमुच <strong>{deleteConfirmCustomer.firmName}</strong> (श्री {deleteConfirmCustomer.name}) का खाता हमेशा के लिए हटाना चाहते हैं?
            </p>

            {deleteConfirmCustomer.currentDue > 0 && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-center space-y-1">
                <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
                <span className="font-bold block">
                  चेतावनी: इस ग्राहक पर ₹{deleteConfirmCustomer.currentDue.toLocaleString('en-IN')} की बकाया उधारी है!
                </span>
                <span className="text-[10px] text-rose-700 block">
                  खाता हटाने पर यह उधारी रिकॉर्ड से हट जाएगी।
                </span>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCustomer(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
              >
                हाँ, खाता डिलीट करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Ledger Drawer / Detail View if selected */}
      {selectedCustomer && (
        <div className="bg-white p-5 rounded-2xl border-2 border-amber-400 shadow-md space-y-4">
          <div className="flex justify-between items-start border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-700">ग्राहक खाता लेजर</span>
              <h3 className="text-lg font-black text-slate-900">{selectedCustomer.firmName}</h3>
              <p className="text-xs text-slate-600">
                श्री {selectedCustomer.name} | फोन: +91 {selectedCustomer.phone} | पता: {selectedCustomer.address}, {selectedCustomer.city}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startEditCustomer(selectedCustomer)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-300"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>एडिट करें</span>
              </button>
              <button
                onClick={() => setDeleteConfirmCustomer(selectedCustomer)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>डिलीट</span>
              </button>
              <button
                onClick={() => handleSendReminder(selectedCustomer)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp तगादा</span>
              </button>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                बंद करें
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">इस ग्राहक के सभी बिल एवं ऑर्डर्स:</h4>
            {customerOrders.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">कोई पूर्व बिल रिकॉर्ड नहीं मिला।</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2 px-3">इनवॉइस नं.</th>
                      <th className="py-2 px-3">तारीख</th>
                      <th className="py-2 px-3">बिल प्रकार</th>
                      <th className="py-2 px-3 text-right">कुल राशि</th>
                      <th className="py-2 px-3 text-right">जमा राशि</th>
                      <th className="py-2 px-3 text-right">बकाया</th>
                      <th className="py-2 px-3 text-center">स्थिति</th>
                      <th className="py-2 px-3 text-center">इनवॉइस देखें</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{order.invoiceNumber}</td>
                        <td className="py-2 px-3">{order.date}</td>
                        <td className="py-2 px-3 uppercase text-[10px] font-bold">{order.billType}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">₹{order.totalAmount}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700">₹{order.paidAmount}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">₹{order.dueAmount}</td>
                        <td className="py-2 px-3 text-center uppercase text-[10px] font-bold">{order.status}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => onSelectOrder(order)}
                            className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-bold"
                          >
                            देखें
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
