import React, { useState } from 'react';
import { ProductionBatch, ProductMaster, Order, BagStockItem, BagSize } from '../types/erp';
import { 
  Factory, 
  Plus, 
  Gauge, 
  Clock, 
  Calendar, 
  Zap, 
  FileText, 
  Layers, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle,
  Edit3,
  Trash2,
  X,
  Save,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ProductionViewProps {
  production: ProductionBatch[];
  products: ProductMaster[];
  orders: Order[];
  bagStock: BagStockItem[];
  onOpenNewProduction: () => void;
  onUpdateProduction?: (updatedBatch: ProductionBatch, originalBatch: ProductionBatch) => void;
  onDeleteProduction?: (batchId: string) => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  production,
  products,
  orders,
  bagStock,
  onOpenNewProduction,
  onUpdateProduction,
  onDeleteProduction,
}) => {
  const [filterShift, setFilterShift] = useState<string>('all');

  // Edit batch state
  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null);
  const [editProductId, setEditProductId] = useState<string>('');
  const [editShift, setEditShift] = useState<ProductionBatch['shift']>('सुबह (Morning)');
  const [editOperatorName, setEditOperatorName] = useState<string>('');
  const [editWheatInputKg, setEditWheatInputKg] = useState<number>(2000);
  const [editAttaOutputKg, setEditAttaOutputKg] = useState<number>(1880);
  const [editChokerOutputKg, setEditChokerOutputKg] = useState<number>(95);
  const [editBags5, setEditBags5] = useState<number>(0);
  const [editBags10, setEditBags10] = useState<number>(0);
  const [editBags25, setEditBags25] = useState<number>(0);
  const [editBags50, setEditBags50] = useState<number>(0);
  const [editElectricityUnits, setEditElectricityUnits] = useState<number>(45);
  const [editNotes, setEditNotes] = useState<string>('');

  // Delete batch state
  const [deleteConfirmBatch, setDeleteConfirmBatch] = useState<ProductionBatch | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBatches = production.filter(b => b.date === todayStr);

  const totalWheatMilledKg = production.reduce((s, b) => s + b.wheatInputKg, 0);
  const totalAttaProducedKg = production.reduce((s, b) => s + b.attaOutputKg, 0);
  const totalChokerKg = production.reduce((s, b) => s + b.chokerOutputKg, 0);
  const totalLossKg = production.reduce((s, b) => s + b.lossKg, 0);
  const avgYieldPercent = totalWheatMilledKg > 0 ? (totalAttaProducedKg / totalWheatMilledKg) * 100 : 0;

  // Pending demand: calculate required bags from pending and in_production orders
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_production');
  const requiredBagsCount = pendingOrders.reduce((sum, o) => {
    return sum + o.items.reduce((s, i) => s + i.quantity, 0);
  }, 0);

  const filteredBatches = production.filter(b => {
    if (filterShift === 'all') return true;
    return b.shift.includes(filterShift);
  });

  const startEditBatch = (batch: ProductionBatch) => {
    setEditingBatch(batch);
    setEditProductId(batch.productId);
    setEditShift(batch.shift);
    setEditOperatorName(batch.operatorName);
    setEditWheatInputKg(batch.wheatInputKg);
    setEditAttaOutputKg(batch.attaOutputKg);
    setEditChokerOutputKg(batch.chokerOutputKg);
    setEditBags5(batch.packedBags[5] || 0);
    setEditBags10(batch.packedBags[10] || 0);
    setEditBags25(batch.packedBags[25] || 0);
    setEditBags50(batch.packedBags[50] || 0);
    setEditElectricityUnits(batch.electricityUnits || 0);
    setEditNotes(batch.notes || '');
  };

  // Calculations for edit batch
  const calcLossKg = Math.max(0, editWheatInputKg - editAttaOutputKg - editChokerOutputKg);
  const calcLossPercent = editWheatInputKg > 0 ? (calcLossKg / editWheatInputKg) * 100 : 0;
  const calcYieldPercent = editWheatInputKg > 0 ? (editAttaOutputKg / editWheatInputKg) * 100 : 0;
  const calcTotalPackedKg = (editBags5 * 5) + (editBags10 * 10) + (editBags25 * 25) + (editBags50 * 50);

  const handleSaveEditBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !onUpdateProduction) return;

    const matchedProduct = products.find(p => p.id === editProductId);

    const updatedBatch: ProductionBatch = {
      ...editingBatch,
      productId: editProductId,
      productName: matchedProduct ? matchedProduct.nameHindi : editingBatch.productName,
      shift: editShift,
      operatorName: editOperatorName.trim(),
      wheatInputKg: editWheatInputKg,
      attaOutputKg: editAttaOutputKg,
      chokerOutputKg: editChokerOutputKg,
      lossKg: calcLossKg,
      lossPercentage: calcLossPercent,
      packedBags: {
        5: editBags5,
        10: editBags10,
        25: editBags25,
        50: editBags50,
      },
      electricityUnits: editElectricityUnits,
      notes: editNotes.trim(),
    };

    onUpdateProduction(updatedBatch, editingBatch);
    setEditingBatch(null);
  };

  const handleConfirmDeleteBatch = () => {
    if (!deleteConfirmBatch || !onDeleteProduction) return;
    onDeleteProduction(deleteConfirmBatch.id);
    setDeleteConfirmBatch(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Factory className="w-6 h-6 text-amber-600" />
            <span>उत्पादन व चक्की पिसाई प्रबंधन (Production Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            गेहूँ पिसाई बैच, आटा यील्ड, चोकर, छीजन % और उत्पादन बैच संशोधन (Edit Production)
          </p>
        </div>

        <button
          onClick={onOpenNewProduction}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ नया पिसाई बैच दर्ज करें</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            कुल गेहूँ पिसाई (Wheat Milled)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono font-black text-2xl text-slate-900">
              {(totalWheatMilledKg / 100).toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-600">क्विंटल ({totalWheatMilledKg.toLocaleString('en-IN')} KG)</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            आज के बैच: {todayBatches.length}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            तैयार शुद्ध आटा (Flour Yield)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono font-black text-2xl text-emerald-700">
              {totalAttaProducedKg.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-bold text-emerald-800">KG</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
            औसत आटा यील्ड: {avgYieldPercent.toFixed(1)}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            उपोत्पाद चोकर (Bran Byproduct)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono font-black text-2xl text-amber-800">
              {totalChokerKg.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-bold text-amber-900">KG</span>
          </div>
          <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
            होलसेल पशु आहार हेतु
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            औसत पिसाई छीजन (Loss %)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono font-black text-2xl text-rose-600">
              {totalLossKg.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-bold text-rose-700">KG</span>
          </div>
          <span className="text-[10px] text-rose-600 font-semibold mt-1 block">
            नमी व छानन: {((totalLossKg / (totalWheatMilledKg || 1)) * 100).toFixed(2)}% (मानक &lt;1.5%)
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">शिफ्ट अनुसार देखें:</span>
          <div className="flex gap-1.5">
            {['all', 'सुबह', 'शाम', 'नाइट'].map((sh) => (
              <button
                key={sh}
                onClick={() => setFilterShift(sh)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  filterShift === sh
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sh === 'all' ? 'सभी शिफ्ट' : sh}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          कुल पिसाई बैच: <strong>{filteredBatches.length}</strong>
        </span>
      </div>

      {/* Production Batch Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">बैच नं. व तारीख</th>
                <th className="py-3 px-3">प्रोडक्ट</th>
                <th className="py-3 px-3">ऑपरेटर व शिफ्ट</th>
                <th className="py-3 px-3 text-right">गेहूँ इनपुट</th>
                <th className="py-3 px-3 text-right">तैयार आटा</th>
                <th className="py-3 px-3 text-right">चोकर (Bran)</th>
                <th className="py-3 px-3 text-right">छीजन %</th>
                <th className="py-3 px-3">पैकिंग बैग गिनती</th>
                <th className="py-3 px-3 text-center">बिजली</th>
                <th className="py-3 px-4 text-center">कार्रवाई (Edit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.map((batch) => {
                const totalBags = Object.values(batch.packedBags).reduce((a, b) => a + b, 0);

                return (
                  <tr key={batch.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block text-xs">
                        {batch.batchNumber}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        📅 {batch.date} • {batch.time}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {batch.productName}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 block text-xs">
                        {batch.operatorName}
                      </span>
                      <span className="text-[10px] text-amber-800 font-bold">
                        {batch.shift}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                      {batch.wheatInputKg} KG
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ({(batch.wheatInputKg / 100).toFixed(1)} क्विं.)
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-700">
                      {batch.attaOutputKg} KG
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-amber-800 font-bold">
                      {batch.chokerOutputKg} KG
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-rose-600 font-bold">
                      {batch.lossPercentage.toFixed(2)}%
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ({batch.lossKg} KG)
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {batch.packedBags[5] > 0 && (
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                            5k: {batch.packedBags[5]}
                          </span>
                        )}
                        {batch.packedBags[10] > 0 && (
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                            10k: {batch.packedBags[10]}
                          </span>
                        )}
                        {batch.packedBags[25] > 0 && (
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                            25k: {batch.packedBags[25]}
                          </span>
                        )}
                        {batch.packedBags[50] > 0 && (
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                            50k: {batch.packedBags[50]}
                          </span>
                        )}
                        <span className="text-slate-500 font-semibold self-center ml-1">
                          (कुल {totalBags} बैग)
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-600 font-semibold">
                      {batch.electricityUnits ? `${batch.electricityUnits} U` : '-'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditBatch(batch)}
                          className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg text-xs font-bold transition"
                          title="पिसाई बैच एडिट करें"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmBatch(batch)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-700 rounded-lg text-xs font-bold transition"
                          title="बैच हटाएँ"
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

      {/* Edit Production Batch Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 text-xs text-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                  <span>पिसाई बैच विवरण संशोधित करें (Edit Batch #{editingBatch.batchNumber})</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  तारीख: {editingBatch.date} • समय: {editingBatch.time}
                </span>
              </div>
              <button onClick={() => setEditingBatch(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBatch} className="overflow-y-auto p-1 space-y-4 my-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">आटा प्रोडक्ट *</label>
                  <select
                    value={editProductId}
                    onChange={(e) => setEditProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameHindi} ({p.brand})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ऑपरेटर का नाम *</label>
                  <input
                    type="text"
                    required
                    value={editOperatorName}
                    onChange={(e) => setEditOperatorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ड्यूटी शिफ्ट *</label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="सुबह (Morning)">सुबह (Morning Shift)</option>
                    <option value="शाम (Evening)">शाम (Evening Shift)</option>
                    <option value="नाइट (Night)">नाइट (Night Shift)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">बिजली यूनिट (Units)</label>
                  <input
                    type="number"
                    min="0"
                    value={editElectricityUnits}
                    onChange={(e) => setEditElectricityUnits(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Milling Quantities (Input, Atta, Choker) */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                <span className="font-bold text-amber-900 block uppercase text-xs tracking-wider">
                  पिसाई वजन एवं उत्पादन (Milling Weight KG)
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 text-[11px] mb-1">गेहूँ इनपुट (KG) *</label>
                    <input
                      type="number"
                      min="100"
                      required
                      value={editWheatInputKg}
                      onChange={(e) => setEditWheatInputKg(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-500 block text-center mt-0.5">
                      = {(editWheatInputKg / 100).toFixed(1)} क्विं.
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-800 text-[11px] mb-1">तैयार आटा (KG) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editAttaOutputKg}
                      onChange={(e) => setEditAttaOutputKg(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg font-mono font-black text-center text-emerald-900"
                    />
                    <span className="text-[10px] text-emerald-700 block text-center mt-0.5">
                      यील्ड: {calcYieldPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-amber-800 text-[11px] mb-1">चोकर आउटपुट (KG) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editChokerOutputKg}
                      onChange={(e) => setEditChokerOutputKg(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-center text-amber-900"
                    />
                    <span className="text-[10px] text-slate-500 block text-center mt-0.5">
                      उपोत्पाद
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-amber-200 flex justify-between items-center text-xs">
                  <span className="text-slate-600">स्वतः परिकलित छीजन (Loss):</span>
                  <span className="font-mono font-bold text-rose-600">
                    {calcLossKg} KG ({calcLossPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Packed Bag Counts */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block uppercase text-xs tracking-wider">
                  तैयार बैग भराई गिनती (Packed Bags)
                </span>

                <div className="grid grid-cols-4 gap-2.5 text-center">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">5 KG बैग</label>
                    <input
                      type="number"
                      min="0"
                      value={editBags5}
                      onChange={(e) => setEditBags5(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">10 KG बैग</label>
                    <input
                      type="number"
                      min="0"
                      value={editBags10}
                      onChange={(e) => setEditBags10(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">25 KG बैग</label>
                    <input
                      type="number"
                      min="0"
                      value={editBags25}
                      onChange={(e) => setEditBags25(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">50 KG बोरी</label>
                    <input
                      type="number"
                      min="0"
                      value={editBags50}
                      onChange={(e) => setEditBags50(Number(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-600 pt-1">
                  <span>बैग में भरा कुल आटा: <strong>{calcTotalPackedKg.toLocaleString('en-IN')} KG</strong></span>
                  <span>तैयार आटा: <strong>{editAttaOutputKg.toLocaleString('en-IN')} KG</strong></span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">बैच रिमार्क व क्वालिटी नोट्स</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="उदा. दाना क्वालिटी 1 नंबर, नमी 10.2%"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-50"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>पिसाई बैच अपडेट करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Batch Confirmation Modal */}
      {deleteConfirmBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-slate-900">
              पिसाई बैच हटाना चाहते हैं?
            </h3>
            
            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              क्या आप सचमुच <strong>#{deleteConfirmBatch.batchNumber}</strong> ({deleteConfirmBatch.productName}) का रिकॉर्ड हटाना चाहते हैं?
            </p>

            <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBatch(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBatch}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
              >
                हाँ, बैच हटाएँ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
