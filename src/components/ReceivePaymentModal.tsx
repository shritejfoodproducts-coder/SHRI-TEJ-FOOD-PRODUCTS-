import React, { useState } from 'react';
import { Customer, CustomerPaymentRecord } from '../types/erp';
import { X, IndianRupee, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReceivePaymentModalProps {
  customers: Customer[];
  selectedCustomerId?: string;
  onClose: () => void;
  onSubmit: (payment: CustomerPaymentRecord) => void;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  customers,
  selectedCustomerId,
  onClose,
  onSubmit,
}) => {
  const [customerId, setCustomerId] = useState<string>(
    selectedCustomerId || customers.find(c => c.currentDue > 0)?.id || customers[0]?.id || ''
  );
  const currentCust = customers.find(c => c.id === customerId);

  const [amount, setAmount] = useState<number>(currentCust?.currentDue || 10000);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'bank' | 'upi'>('upi');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('श्री तेज प्रकाश (मालिक)');
  const [notes, setNotes] = useState<string>('खाता बकाया भुगतान प्राप्ति');

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const c = customers.find(x => x.id === id);
    if (c) {
      setAmount(c.currentDue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCust || amount <= 0) return;

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // safe fallback
    }

    const payment: CustomerPaymentRecord = {
      id: `pay-${Date.now()}`,
      customerId: currentCust.id,
      customerName: `${currentCust.firmName} (${currentCust.name})`,
      date: new Date().toISOString().slice(0, 10),
      amount: Number(amount),
      paymentMode,
      referenceNo,
      receivedBy,
      notes,
    };

    onSubmit(payment);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-base">ग्राहक से भुगतान प्राप्त करें (Receive Payment)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800">
          <div>
            <label className="block font-bold text-slate-700 mb-1">ग्राहक चुनें *</label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firmName} - {c.name} [बकाया: ₹{c.currentDue.toLocaleString('en-IN')}]
                </option>
              ))}
            </select>
          </div>

          {currentCust && (
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">वर्तमान कुल बकाया</span>
                <span className="font-mono font-bold text-base text-rose-600">
                  ₹{currentCust.currentDue.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAmount(currentCust.currentDue)}
                className="text-[11px] font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-2.5 py-1 rounded-lg"
              >
                पूरा हिसाब भरें
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">जमा राशि (₹) *</label>
              <input
                type="number"
                min={1}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">माध्यम (Payment Mode) *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="upi">ऑनलाइन UPI (GPay/PhonePe)</option>
                <option value="cash">नकद गल्ला (Cash)</option>
                <option value="bank">बैंक ट्रांसफर (NEFT/Cheque)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">UPI Ref / चेक नं.</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="UPI-984128 / CHQ-104"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">वसूली कर्ता *</label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">टिप्पणी / विवरण</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="उदा. बकाया खाते का भुगतान मिला"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>भुगतान दर्ज करें (खाता घटाएं)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
