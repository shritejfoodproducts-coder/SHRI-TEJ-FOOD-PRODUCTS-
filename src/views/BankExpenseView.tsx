import React, { useState } from 'react';
import { ExpenseRecord, ExpenseCategory, CompanySettings, Order } from '../types/erp';
import { 
  Landmark, 
  ReceiptText, 
  Plus, 
  Wallet, 
  QrCode, 
  Building2, 
  CreditCard, 
  Search, 
  Filter,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';

interface BankExpenseViewProps {
  expenses: ExpenseRecord[];
  orders: Order[];
  settings: CompanySettings;
  onOpenNewExpense: () => void;
}

export const BankExpenseView: React.FC<BankExpenseViewProps> = ({
  expenses,
  orders,
  settings,
  onOpenNewExpense,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate Balances
  // Cash inflow from orders
  const cashIn = orders.filter(o => o.paymentMode === 'cash').reduce((s, o) => s + o.paidAmount, 0);
  const cashOut = expenses.filter(e => e.paymentMode === 'cash').reduce((s, e) => s + e.amount, 0);
  const cashBalance = Math.max(0, 45000 + cashIn - cashOut); // base initial reserve ₹45k

  // Bank inflow & outflow
  const bankIn = orders.filter(o => o.paymentMode === 'bank').reduce((s, o) => s + o.paidAmount, 0);
  const bankOut = expenses.filter(e => e.paymentMode === 'bank').reduce((s, e) => s + e.amount, 0);
  const bankBalance = Math.max(0, 350000 + bankIn - bankOut); // base initial reserve ₹3.5L

  // UPI inflow & outflow
  const upiIn = orders.filter(o => o.paymentMode === 'upi').reduce((s, o) => s + o.paidAmount, 0);
  const upiOut = expenses.filter(e => e.paymentMode === 'upi').reduce((s, e) => s + e.amount, 0);
  const upiBalance = Math.max(0, 65000 + upiIn - upiOut); // base initial reserve ₹65k

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.paidTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.voucherNo.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    return true;
  });

  const totalExpenseSum = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-amber-600" />
            <span>बैंक, कैश गल्ला एवं खर्च प्रबंधन (Bank & Expenses)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            SBI चालू खाता, नकद गल्ला, UPI मर्चेंट एवं फैक्ट्री खर्च वाउचर्स
          </p>
        </div>

        <button
          onClick={onOpenNewExpense}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>+ नया खर्च वाउचर दर्ज करें</span>
        </button>
      </div>

      {/* 3 Live Accounts Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash in Hand */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                नकद गल्ला (Cash in Hand)
              </span>
              <span className="font-mono font-black text-2xl sm:text-3xl block mt-1">
                ₹{cashBalance.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-100/90 mt-2 font-medium">
            फैक्ट्री काउंटर कैश बॉक्स बैलेंस
          </p>
        </div>

        {/* Bank Account */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">
                SBI बैंक खाता (Current A/C)
              </span>
              <span className="font-mono font-black text-2xl sm:text-3xl block mt-1">
                ₹{bankBalance.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-[11px] text-blue-100/90 mt-2 font-mono">
            A/C: {settings.accountNumber} • IFSC: {settings.ifscCode}
          </p>
        </div>

        {/* UPI Merchant */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-purple-100 uppercase tracking-wider block">
                UPI ऑनलाइन (PhonePe / GPay)
              </span>
              <span className="font-mono font-black text-2xl sm:text-3xl block mt-1">
                ₹{upiBalance.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-2.5 bg-white/20 rounded-xl">
              <QrCode className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-[11px] text-purple-100/90 mt-2 font-mono">
            VPA: {settings.upiId}
          </p>
        </div>
      </div>

      {/* Expense Vouchers Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                फैक्ट्री खर्च वाउचर्स (Expense Vouchers)
              </h2>
              <span className="text-[11px] text-slate-500">कुल दर्ज खर्च: ₹{totalExpenseSum.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="खर्च विवरण या वाउचर खोजें..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium"
            >
              <option value="all">सभी श्रेणियाँ</option>
              <option value="wheat_purchase">गेहूँ मंडी खरीद</option>
              <option value="diesel_fuel">गाड़ी डीजल व जनरेटर</option>
              <option value="labor_salary">मजदूरी व सैलरी</option>
              <option value="bag_purchase">खाली बैग खरीद</option>
              <option value="electricity">बिजली बिल</option>
              <option value="maintenance">मिल रिपेयर</option>
              <option value="office_tea">चाय-नाश्ता</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">वाउचर नं. व तारीख</th>
                <th className="py-3 px-3">खर्च श्रेणी</th>
                <th className="py-3 px-3">विवरण / Title</th>
                <th className="py-3 px-3">भुगतान प्राप्तकर्ता</th>
                <th className="py-3 px-3 text-center">माध्यम</th>
                <th className="py-3 px-3 text-right">राशि (₹)</th>
                <th className="py-3 px-4">एंट्री कर्ता</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900 block">
                      {exp.voucherNo}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      📅 {exp.date}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                      {exp.categoryHindi}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {exp.title}
                    {exp.notes && (
                      <span className="text-[10px] text-slate-500 block font-normal">
                        नोट: {exp.notes}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-slate-700 font-medium">
                    {exp.paidTo}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      exp.paymentMode === 'upi' ? 'bg-purple-100 text-purple-800' :
                      exp.paymentMode === 'bank' ? 'bg-blue-100 text-blue-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {exp.paymentMode}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-black text-rose-600 text-sm">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3 px-4 text-slate-600 text-[11px]">
                    {exp.recordedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
