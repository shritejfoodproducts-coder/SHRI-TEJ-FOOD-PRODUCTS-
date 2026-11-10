import React, { useState } from 'react';
import { ExpenseRecord, ExpenseCategory } from '../types/erp';
import { X, ReceiptText, CheckCircle2 } from 'lucide-react';

interface NewExpenseModalProps {
  onClose: () => void;
  onSubmit: (expense: ExpenseRecord) => void;
}

const CATEGORIES: { id: ExpenseCategory; nameHindi: string }[] = [
  { id: 'wheat_purchase', nameHindi: 'गेहूँ मंडी खरीद (Wheat Purchase)' },
  { id: 'labor_salary', nameHindi: 'मजदूरी व स्टाफ सैलरी (Labor & Wages)' },
  { id: 'diesel_fuel', nameHindi: 'गाड़ी डीजल व जनरेटर (Diesel & Fuel)' },
  { id: 'electricity', nameHindi: 'बिजली बिल (Electricity Power)' },
  { id: 'bag_purchase', nameHindi: 'खाली बैग खरीद (Packing Material)' },
  { id: 'maintenance', nameHindi: 'मिल रिपेयर व पार्ट्स (Maintenance)' },
  { id: 'transport', nameHindi: 'आवक भाड़ा (Freight & Transport)' },
  { id: 'office_tea', nameHindi: 'चाय-नाश्ता व विविध (Office & General)' },
];

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ onClose, onSubmit }) => {
  const [category, setCategory] = useState<ExpenseCategory>('diesel_fuel');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<number>(1500);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'bank' | 'upi'>('upi');
  const [paidTo, setPaidTo] = useState<string>('');
  const [recordedBy, setRecordedBy] = useState<string>('दिनेश गुप्ता (अकाउंटेंट)');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catObj = CATEGORIES.find(c => c.id === category);
    const voucherNo = `V-${Math.floor(1000 + Math.random() * 9000)}`;

    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      category,
      categoryHindi: catObj?.nameHindi || 'सामान्य खर्च',
      title,
      amount: Number(amount),
      paymentMode,
      paidTo,
      voucherNo,
      recordedBy,
      notes,
    };

    onSubmit(newExpense);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">नया फैक्ट्री खर्च दर्ज करें (Expense Voucher)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">खर्च श्रेणी (Category) *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.nameHindi}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">खर्च का विवरण (Title/Description) *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="उदा. बोलेरो पिकअप गाड़ी में डीजल / हमाली मजदूरी"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">खर्च राशि (₹) *</label>
              <input
                type="number"
                min={1}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-rose-600 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">भुगतान माध्यम (Mode) *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="upi">ऑनलाइन UPI</option>
                <option value="cash">नकद (गल्ला)</option>
                <option value="bank">बैंक खाता (SBI)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">किसे भुगतान किया (Paid To) *</label>
              <input
                type="text"
                required
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="उदा. इंडियन ऑयल पंप / लेबर सरदार"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">खर्च दर्जकर्ता *</label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">टिप्पणी / बिल रसीद संदर्भ</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="उदा. बिल नं. 5421 / पर्ची संलग्न"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
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
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>वाउचर सेव करें</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
