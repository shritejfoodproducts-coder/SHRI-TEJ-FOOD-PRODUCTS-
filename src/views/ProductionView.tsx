import React, { useState } from 'react';
import { ProductionBatch, ProductMaster, Order, BagStockItem } from '../types/erp';
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
  AlertCircle
} from 'lucide-react';

interface ProductionViewProps {
  production: ProductionBatch[];
  products: ProductMaster[];
  orders: Order[];
  bagStock: BagStockItem[];
  onOpenNewProduction: () => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  production,
  products,
  orders,
  bagStock,
  onOpenNewProduction,
}) => {
  const [filterShift, setFilterShift] = useState<string>('all');

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
            गेहूँ पिसाई बैच, आटा यील्ड, चोकर, छीजन % और 5-10-25-50 KG बैग पैकिंग लॉग
          </p>
        </div>

        <button
          onClick={onOpenNewProduction}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ नया प्रोडक्शन बैच दर्ज करें</span>
        </button>
      </div>

      {/* Production KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">आज का आटा उत्पादन</span>
          <span className="font-mono font-black text-2xl text-slate-900 block mt-1">
            {todayBatches.reduce((s, b) => s + b.attaOutputKg, 0).toLocaleString('en-IN')} <span className="text-xs font-normal">KG</span>
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
            {todayBatches.length} बैच पिसाई पूरी
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">औसत पिसाई यील्ड</span>
          <span className="font-mono font-black text-2xl text-emerald-700 block mt-1">
            {avgYieldPercent.toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            छीजन औसतन: ~1.25% (सामान्य)
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">कुल चोकर आउटपुट</span>
          <span className="font-mono font-black text-2xl text-amber-800 block mt-1">
            {totalChokerKg.toLocaleString('en-IN')} <span className="text-xs font-normal">KG</span>
          </span>
          <span className="text-[11px] text-amber-700 block mt-0.5">
            पशु आहार व कैटल फीड
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">पेंडिंग ऑर्डर मांग</span>
          <span className="font-mono font-black text-2xl text-amber-600 block mt-1">
            {requiredBagsCount} <span className="text-xs font-normal">बैग</span>
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {pendingOrders.length} ऑर्डर्स तैयार होने बाकी हैं
          </span>
        </div>
      </div>

      {/* Production Batches Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>दैनिक उत्पादन बैच इतिहास (Production Batch Records)</span>
          </h2>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">शिफ्ट:</span>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
            >
              <option value="all">सभी शिफ्ट</option>
              <option value="Morning">सुबह (Morning)</option>
              <option value="Evening">शाम (Evening)</option>
              <option value="Night">नाइट (Night)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">बैच नं. व समय</th>
                <th className="py-3 px-3">प्रोडक्ट</th>
                <th className="py-3 px-3">शिफ्ट व ऑपरेटर</th>
                <th className="py-3 px-3 text-right">गेहूँ इनपुट</th>
                <th className="py-3 px-3 text-right">तैयार आटा</th>
                <th className="py-3 px-3 text-right">चोकर</th>
                <th className="py-3 px-3 text-right">छीजन %</th>
                <th className="py-3 px-3">तैयार बैग पैकिंग</th>
                <th className="py-3 px-3 text-center">बिजली</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.map((batch) => {
                const totalBags = 
                  (batch.packedBags[5] || 0) + 
                  (batch.packedBags[10] || 0) + 
                  (batch.packedBags[25] || 0) + 
                  (batch.packedBags[50] || 0);

                return (
                  <tr key={batch.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
