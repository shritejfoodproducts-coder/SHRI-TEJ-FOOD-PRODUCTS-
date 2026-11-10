import React, { useState } from 'react';
import { ProductMaster, ProductionBatch, BagSize, UserProfile } from '../types/erp';
import { X, Factory, Gauge, CheckCircle2, AlertTriangle } from 'lucide-react';

interface NewProductionModalProps {
  products: ProductMaster[];
  staff: UserProfile[];
  onClose: () => void;
  onSubmit: (batch: ProductionBatch) => void;
}

export const NewProductionModal: React.FC<NewProductionModalProps> = ({
  products,
  staff,
  onClose,
  onSubmit,
}) => {
  const [productId, setProductId] = useState<string>(products[1]?.id || products[0]?.id);
  const [shift, setShift] = useState<'सुबह (Morning)' | 'शाम (Evening)' | 'नाइट (Night)'>('सुबह (Morning)');
  const [operatorName, setOperatorName] = useState<string>('ओमप्रकाश जांगिड़');
  const [wheatInputKg, setWheatInputKg] = useState<number>(2000); // 20 Quintals default
  const [attaOutputKg, setAttaOutputKg] = useState<number>(1880);
  const [chokerOutputKg, setChokerOutputKg] = useState<number>(95);
  const [electricityUnits, setElectricityUnits] = useState<number>(45);
  const [notes, setNotes] = useState<string>('दाना क्वालिटी उत्तम, नमी 10.5%');

  // Bag counts
  const [packedBags, setPackedBags] = useState<Record<BagSize, number>>({
    5: 40,   // 200 KG
    10: 60,  // 600 KG
    25: 20,  // 500 KG
    50: 11,  // 550 KG
  });

  const selectedProduct = products.find(p => p.id === productId);

  // Auto calculate loss
  const totalOut = Number(attaOutputKg) + Number(chokerOutputKg);
  const lossKg = Math.max(0, Number(wheatInputKg) - totalOut);
  const lossPercentage = Number(wheatInputKg) > 0 ? (lossKg / Number(wheatInputKg)) * 100 : 0;

  // Packed total weight
  const totalPackedKg = 
    (packedBags[5] * 5) + 
    (packedBags[10] * 10) + 
    (packedBags[25] * 25) + 
    (packedBags[50] * 50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const batchId = `batch-${Date.now()}`;
    const batchNumber = `BATCH-${dateStr.replace(/-/g, '').slice(4)}-${Math.floor(10 + Math.random() * 90)}`;

    const newBatch: ProductionBatch = {
      id: batchId,
      batchNumber,
      date: dateStr,
      time: timeStr,
      productId: selectedProduct.id,
      productName: selectedProduct.nameHindi,
      shift,
      operatorName,
      wheatInputKg: Number(wheatInputKg),
      attaOutputKg: Number(attaOutputKg),
      chokerOutputKg: Number(chokerOutputKg),
      lossKg,
      lossPercentage,
      packedBags,
      electricityUnits: Number(electricityUnits),
      status: 'completed',
      notes,
    };

    onSubmit(newBatch);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Factory className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">नया उत्पादन बैच दर्ज करें (Flour Milling Batch)</h2>
              <p className="text-xs text-amber-200 font-medium">चक्की पिसाई, चोकर व बैग पैकिंग हिसाब</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-sm text-slate-800">
          {/* Row 1: Product & Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                प्रोडक्ट (आटा प्रकार) *
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameHindi}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                पिसाई शिफ्ट *
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="सुबह (Morning)">सुबह (Morning)</option>
                <option value="शाम (Evening)">शाम (Evening)</option>
                <option value="नाइट (Night)">नाइट (Night)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                चक्की ऑपरेटर *
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Milling Input / Output Row */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase">
              <Gauge className="w-4 h-4 text-amber-700" />
              <span>पिसाई एवं आउटपुट आँकड़े (Milling Yield Metrics)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  गेहूँ इनपुट (KG) *
                </label>
                <input
                  type="number"
                  min={100}
                  step={10}
                  value={wheatInputKg}
                  onChange={(e) => setWheatInputKg(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  = {(wheatInputKg / 100).toFixed(1)} क्विंटल
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  तैयार आटा (KG) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={attaOutputKg}
                  onChange={(e) => setAttaOutputKg(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-700"
                />
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  यील्ड: {wheatInputKg > 0 ? ((attaOutputKg / wheatInputKg) * 100).toFixed(1) : 0}%
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  चोकर / Bran (KG)
                </label>
                <input
                  type="number"
                  min={0}
                  value={chokerOutputKg}
                  onChange={(e) => setChokerOutputKg(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-amber-800"
                />
                <span className="text-[10px] text-amber-700 block mt-0.5">
                  चोकर: {wheatInputKg > 0 ? ((chokerOutputKg / wheatInputKg) * 100).toFixed(1) : 0}%
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">छीजन / धूल लॉस</span>
                <span className="block font-mono font-bold text-base text-rose-600">
                  {lossKg} KG
                </span>
                <span className="text-[10px] font-semibold text-rose-500">
                  {lossPercentage.toFixed(2)}% छीजन
                </span>
              </div>
            </div>
          </div>

          {/* Bags Packing Breakdown */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                  बैग पैकिंग गिनती (Packaged Bags Count)
                </span>
                <p className="text-[11px] text-slate-500">
                  तैयार आटे की बोरियों में भराई का हिसाब (यह स्टॉक में सीधे जुड़ेगा)
                </p>
              </div>
              <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-full ${
                totalPackedKg > attaOutputKg ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
              }`}>
                कुल भराई: {totalPackedKg} KG / {attaOutputKg} KG
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-1">5 KG बैग</span>
                <input
                  type="number"
                  min={0}
                  value={packedBags[5]}
                  onChange={(e) => setPackedBags({ ...packedBags, 5: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                />
                <span className="text-[10px] text-slate-500 block text-center mt-1">
                  = {packedBags[5] * 5} KG
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-1">10 KG बैग</span>
                <input
                  type="number"
                  min={0}
                  value={packedBags[10]}
                  onChange={(e) => setPackedBags({ ...packedBags, 10: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                />
                <span className="text-[10px] text-slate-500 block text-center mt-1">
                  = {packedBags[10] * 10} KG
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-1">25 KG बैग</span>
                <input
                  type="number"
                  min={0}
                  value={packedBags[25]}
                  onChange={(e) => setPackedBags({ ...packedBags, 25: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                />
                <span className="text-[10px] text-slate-500 block text-center mt-1">
                  = {packedBags[25] * 25} KG
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-1">50 KG बैग</span>
                <input
                  type="number"
                  min={0}
                  value={packedBags[50]}
                  onChange={(e) => setPackedBags({ ...packedBags, 50: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                />
                <span className="text-[10px] text-slate-500 block text-center mt-1">
                  = {packedBags[50] * 50} KG
                </span>
              </div>
            </div>

            {totalPackedKg > attaOutputKg && (
              <div className="flex items-center gap-2 p-2 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium border border-rose-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>सावधानी: पैक किए गए बैग्स का वजन ({totalPackedKg} KG) तैयार आटा ({attaOutputKg} KG) से अधिक है। कृपया मात्रा जांचें।</span>
              </div>
            )}
          </div>

          {/* Row 4: Power units & notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                बिजली खपत (यूनिट)
              </label>
              <input
                type="number"
                min={0}
                value={electricityUnits}
                onChange={(e) => setElectricityUnits(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                क्वालिटी व पिसाई टिप्पणी (Notes)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="उदा. एमपी शरबती गेहूं दाना, महीन पिसाई, छीजन सामान्य"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Submit buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-700/20 transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>उत्पादन बैच सेव करें व स्टॉक अपडेट करें</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
