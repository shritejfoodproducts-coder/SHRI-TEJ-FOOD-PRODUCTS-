import React, { useState } from 'react';
import { RawMaterialStock, BagStockItem, ProductMaster, BagSize } from '../types/erp';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Wheat, 
  Boxes, 
  Layers, 
  CheckCircle2,
  Edit3,
  Save,
  X,
  SlidersHorizontal,
  Info
} from 'lucide-react';

interface InventoryViewProps {
  rawStock: RawMaterialStock;
  bagStock: BagStockItem[];
  products: ProductMaster[];
  onUpdateRawStock: (newRaw: RawMaterialStock) => void;
  onUpdateBagStock: (productId: string, bagSize: BagSize, newCount: number) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  rawStock,
  bagStock,
  products,
  onUpdateRawStock,
  onUpdateBagStock,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  
  // Wheat purchase modal
  const [showWheatModal, setShowWheatModal] = useState(false);
  const [wheatQuintalsInput, setWheatQuintalsInput] = useState(40);
  const [wheatRateInput, setWheatRateInput] = useState(2600);

  // Direct edit wheat stock modal
  const [showEditWheatModal, setShowEditWheatModal] = useState(false);
  const [editWheatQuintals, setEditWheatQuintals] = useState<number>(rawStock.wheatQuintals);
  const [editWheatRate, setEditWheatRate] = useState<number>(rawStock.avgPurchaseRateQuintal);
  const [wheatEditReason, setWheatEditReason] = useState<string>('गोदाम भौतिक सत्यापन (Physical Stock Verification)');

  // Empty bags add modal
  const [showEmptyBagsModal, setShowEmptyBagsModal] = useState(false);
  const [emptyBagSizeInput, setEmptyBagSizeInput] = useState<BagSize>(10);
  const [emptyBagCountInput, setEmptyBagCountInput] = useState(1000);

  // Direct edit empty bags & thread modal
  const [showEditPackagingModal, setShowEditPackagingModal] = useState(false);
  const [editBags5, setEditBags5] = useState<number>(rawStock.emptyBags[5] || 0);
  const [editBags10, setEditBags10] = useState<number>(rawStock.emptyBags[10] || 0);
  const [editBags25, setEditBags25] = useState<number>(rawStock.emptyBags[25] || 0);
  const [editBags50, setEditBags50] = useState<number>(rawStock.emptyBags[50] || 0);
  const [editThreadKg, setEditThreadKg] = useState<number>(rawStock.stitchingThreadKg || 0);

  // Edit finished goods bag stock modal
  const [editingItem, setEditingItem] = useState<{ productId: string; bagSize: BagSize; current: number } | null>(null);
  const [editCount, setEditCount] = useState<number>(0);

  // Master quick inventory edit modal
  const [showMasterEditModal, setShowMasterEditModal] = useState(false);
  const [masterBagCounts, setMasterBagCounts] = useState<Record<string, number>>({});

  // Low stock items
  const lowStockItems = bagStock.filter(item => item.packedCount <= item.minThreshold);

  // Handlers
  const handleAddWheat = (e: React.FormEvent) => {
    e.preventDefault();
    const addedQuintals = Number(wheatQuintalsInput) || 0;
    const rate = Number(wheatRateInput) || 2600;

    const totalOldVal = rawStock.wheatQuintals * rawStock.avgPurchaseRateQuintal;
    const totalNewVal = addedQuintals * rate;
    const newTotalQuintals = rawStock.wheatQuintals + addedQuintals;
    const newAvgRate = newTotalQuintals > 0 ? Math.round((totalOldVal + totalNewVal) / newTotalQuintals) : rate;

    onUpdateRawStock({
      ...rawStock,
      wheatQuintals: newTotalQuintals,
      avgPurchaseRateQuintal: newAvgRate,
      lastUpdated: new Date().toISOString(),
    });
    setShowWheatModal(false);
  };

  const handleSaveEditWheat = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRawStock({
      ...rawStock,
      wheatQuintals: Number(editWheatQuintals) || 0,
      avgPurchaseRateQuintal: Number(editWheatRate) || 0,
      lastUpdated: new Date().toISOString(),
    });
    setShowEditWheatModal(false);
  };

  const handleAddEmptyBags = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Number(emptyBagCountInput) || 0;
    onUpdateRawStock({
      ...rawStock,
      emptyBags: {
        ...rawStock.emptyBags,
        [emptyBagSizeInput]: (rawStock.emptyBags[emptyBagSizeInput] || 0) + count,
      },
      lastUpdated: new Date().toISOString(),
    });
    setShowEmptyBagsModal(false);
  };

  const handleSaveEditPackaging = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRawStock({
      ...rawStock,
      emptyBags: {
        5: Number(editBags5) || 0,
        10: Number(editBags10) || 0,
        25: Number(editBags25) || 0,
        50: Number(editBags50) || 0,
      },
      stitchingThreadKg: Number(editThreadKg) || 0,
      lastUpdated: new Date().toISOString(),
    });
    setShowEditPackagingModal(false);
  };

  const handleSaveEditStock = () => {
    if (!editingItem) return;
    onUpdateBagStock(editingItem.productId, editingItem.bagSize, Number(editCount) || 0);
    setEditingItem(null);
  };

  const openMasterEditModal = () => {
    const initialMap: Record<string, number> = {};
    bagStock.forEach(item => {
      initialMap[`${item.productId}_${item.bagSize}`] = item.packedCount;
    });
    setMasterBagCounts(initialMap);
    setEditWheatQuintals(rawStock.wheatQuintals);
    setEditWheatRate(rawStock.avgPurchaseRateQuintal);
    setEditBags5(rawStock.emptyBags[5] || 0);
    setEditBags10(rawStock.emptyBags[10] || 0);
    setEditBags25(rawStock.emptyBags[25] || 0);
    setEditBags50(rawStock.emptyBags[50] || 0);
    setEditThreadKg(rawStock.stitchingThreadKg || 0);
    setShowMasterEditModal(true);
  };

  const handleSaveMasterEdit = (e: React.FormEvent) => {
    e.preventDefault();
    // 1. Update Raw Stock
    onUpdateRawStock({
      ...rawStock,
      wheatQuintals: Number(editWheatQuintals) || 0,
      avgPurchaseRateQuintal: Number(editWheatRate) || 0,
      emptyBags: {
        5: Number(editBags5) || 0,
        10: Number(editBags10) || 0,
        25: Number(editBags25) || 0,
        50: Number(editBags50) || 0,
      },
      stitchingThreadKg: Number(editThreadKg) || 0,
      lastUpdated: new Date().toISOString(),
    });

    // 2. Update all bag stock counts
    Object.entries(masterBagCounts).forEach(([key, count]) => {
      const [prodId, sizeStr] = key.split('_');
      onUpdateBagStock(prodId, Number(sizeStr) as BagSize, Number(count) || 0);
    });

    setShowMasterEditModal(false);
  };

  // Filtered ready stock
  const filteredBagStock = bagStock.filter(item => {
    if (selectedProductId === 'all') return true;
    return item.productId === selectedProductId;
  });

  const totalReadyBags = bagStock.reduce((s, b) => s + b.packedCount, 0);
  const totalFlourWeightKg = bagStock.reduce((s, b) => s + (b.packedCount * b.bagSize), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-600" />
            <span>इन्वेंट्री एवं स्टॉक प्रबंधन (Inventory Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            कच्चा गेहूँ, 5-10-25-50 KG तैयार आटा बोरियां एवं खाली प्रिंटेड बैग्स स्टॉक संशोधन व संपादन
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Master Edit Button */}
          <button
            onClick={openMasterEditModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            title="सभी स्टॉक को एक साथ एडिट करें"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>⚡ संपूर्ण स्टॉक एडिट करें</span>
          </button>

          <button
            onClick={() => setShowWheatModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Wheat className="w-4 h-4" />
            <span>+ गेहूँ मंडी आवक</span>
          </button>
          
          <button
            onClick={() => setShowEmptyBagsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Layers className="w-4 h-4" />
            <span>+ खाली बैग जोड़ें</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-rose-900 text-sm">
              चेतावनी: {lowStockItems.length} प्रोडक्ट्स का स्टॉक न्यूनतम सीमा से कम हो गया है!
            </h4>
            <p className="text-rose-700 mt-0.5">
              तुरंत चक्की पिसाई व बैग पैकिंग का आदेश दें ताकि ऑर्डर्स की डिलीवरी प्रभावित न हो।
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStockItems.map((item, idx) => {
                const prod = products.find(p => p.id === item.productId);
                return (
                  <span key={idx} className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md text-[11px]">
                    {prod?.nameHindi} ({item.bagSize} KG): केवल {item.packedCount} बैग बचे
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Raw Wheat & Packaging Material */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Raw Wheat Card */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl p-5 border border-amber-300 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                <Wheat className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">कच्चा गेहूँ (Raw Wheat)</span>
                <h3 className="font-bold text-slate-900 text-base">गोदाम कुल आवक</h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setEditWheatQuintals(rawStock.wheatQuintals);
                  setEditWheatRate(rawStock.avgPurchaseRateQuintal);
                  setShowEditWheatModal(true);
                }}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                title="कच्चा गेहूं स्टॉक संख्या सीधे एडिट करें"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>एडिट</span>
              </button>
              <button
                onClick={() => setShowWheatModal(true)}
                className="px-2.5 py-1 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 transition"
              >
                + आवक
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-black text-3xl text-amber-950">
                {rawStock.wheatQuintals.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-amber-900">क्विंटल</span>
            </div>
            <p className="text-xs text-amber-800 font-medium">
              = {(rawStock.wheatQuintals * 100).toLocaleString('en-IN')} KG शुद्ध दानेदार गेहूँ
            </p>

            <div className="pt-3 border-t border-amber-200/80 flex justify-between text-xs text-amber-900">
              <span>औसत खरीद दर:</span>
              <span className="font-mono font-bold">₹{rawStock.avgPurchaseRateQuintal} / क्विंटल</span>
            </div>
            <div className="flex justify-between text-xs text-amber-900">
              <span>अनुमानित कुल लागत मूल्य:</span>
              <span className="font-mono font-bold">
                ₹{Math.round(rawStock.wheatQuintals * rawStock.avgPurchaseRateQuintal).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Empty Printed Bags Stock */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-900 text-amber-400 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  पैकिंग मटेरियल स्टॉक (खाली प्रिंटेड बैग्स व धागा)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tejstha ब्रांड 5, 10, 25 एवं 50 KG खाली बोरियों की गिनती
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setEditBags5(rawStock.emptyBags[5] || 0);
                  setEditBags10(rawStock.emptyBags[10] || 0);
                  setEditBags25(rawStock.emptyBags[25] || 0);
                  setEditBags50(rawStock.emptyBags[50] || 0);
                  setEditThreadKg(rawStock.stitchingThreadKg || 0);
                  setShowEditPackagingModal(true);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 rounded-lg text-xs font-bold transition flex items-center gap-1"
                title="खाली बैग व धागे का स्टॉक सीधे एडिट करें"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>एडिट स्टॉक</span>
              </button>
              <button
                onClick={() => setShowEmptyBagsModal(true)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
              >
                + बैग जोड़ें
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px] font-bold">5 KG बैग</span>
              <span className="font-mono font-black text-xl text-slate-900 block my-1">
                {(rawStock.emptyBags[5] || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">नग उपलब्ध</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px] font-bold">10 KG बैग</span>
              <span className="font-mono font-black text-xl text-slate-900 block my-1">
                {(rawStock.emptyBags[10] || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">नग उपलब्ध</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px] font-bold">25 KG बैग</span>
              <span className="font-mono font-black text-xl text-slate-900 block my-1">
                {(rawStock.emptyBags[25] || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">नग उपलब्ध</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px] font-bold">50 KG बोरी</span>
              <span className="font-mono font-black text-xl text-slate-900 block my-1">
                {(rawStock.emptyBags[50] || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">नग उपलब्ध</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-slate-500 block text-[11px] font-bold">सिलाई धागा</span>
              <span className="font-mono font-black text-xl text-purple-700 block my-1">
                {rawStock.stitchingThreadKg}
              </span>
              <span className="text-[10px] text-purple-600 font-semibold">KG उपलब्ध</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Ready Finished Goods Atta Stock */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900">
                तैयार आटा स्टॉक विवरण (Finished Flour Bags in Warehouse)
              </h2>
              <p className="text-xs text-slate-500">
                कुल तैयार: <strong className="text-slate-900 font-mono">{totalReadyBags} बैग्स</strong> ({totalFlourWeightKg.toLocaleString('en-IN')} KG)
              </p>
            </div>
          </div>

          {/* Filter by product */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">प्रोडक्ट:</span>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium"
            >
              <option value="all">सभी 5 प्रोडक्ट्स</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameHindi}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ready Stock Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">प्रोडक्ट का नाम</th>
                <th className="py-3 px-3 text-center">बैग साइज (KG)</th>
                <th className="py-3 px-3 text-center">तैयार बैग (Packed)</th>
                <th className="py-3 px-3 text-center">ऑर्डर में बुक</th>
                <th className="py-3 px-3 text-center">उपलब्ध स्टॉक</th>
                <th className="py-3 px-3 text-right">कुल वजन (KG)</th>
                <th className="py-3 px-3 text-right">रेट / बैग</th>
                <th className="py-3 px-3 text-right">स्टॉक वैल्यू (₹)</th>
                <th className="py-3 px-3 text-center">स्थिति</th>
                <th className="py-3 px-4 text-center">एडिट स्टॉक</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBagStock.map((item) => {
                const prod = products.find(p => p.id === item.productId);
                const isLow = item.packedCount <= item.minThreshold;
                const available = Math.max(0, item.packedCount - item.reservedCount);
                const totalWeight = item.packedCount * item.bagSize;
                const rate = prod?.rates[item.bagSize] || 0;
                const stockVal = item.packedCount * rate;

                return (
                  <tr key={`${item.productId}-${item.bagSize}`} className={`hover:bg-slate-50 transition ${
                    isLow ? 'bg-rose-50/40' : ''
                  }`}>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block text-xs">
                        {prod?.nameHindi}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {prod?.brand} • HSN: {prod?.hsnCode}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                        {item.bagSize} KG
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-black text-sm text-slate-900">
                      {item.packedCount}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-amber-700 font-semibold">
                      {item.reservedCount}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                      {available}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {totalWeight.toLocaleString('en-IN')} KG
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ₹{rate}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{stockVal.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {isLow ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold">
                          ⚠️ कम स्टॉक
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          पर्याप्त ✓
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setEditingItem({ productId: item.productId, bagSize: item.bagSize, current: item.packedCount });
                          setEditCount(item.packedCount);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 mx-auto"
                        title="बैग स्टॉक संख्या बदलें"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                        <span>एडिट</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Direct Edit Wheat Stock (गेहूं स्टॉक सीधा एडिट करें) */}
      {showEditWheatModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-600" />
                <span>कच्चा गेहूँ स्टॉक एडिट करें (Edit Wheat Stock)</span>
              </h3>
              <button onClick={() => setShowEditWheatModal(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditWheat} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  गोदाम में वर्तमान कुल गेहूँ (क्विंटल में) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editWheatQuintals}
                  onChange={(e) => setEditWheatQuintals(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-base text-amber-950"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  = {(editWheatQuintals * 100).toLocaleString('en-IN')} KG गेहूँ
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  औसत खरीद दर (₹ प्रति क्विंटल) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editWheatRate}
                  onChange={(e) => setEditWheatRate(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">संशोधन का कारण (Reason)</label>
                <input
                  type="text"
                  value={wheatEditReason}
                  onChange={(e) => setWheatEditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex justify-between items-center text-xs">
                <span className="font-bold text-amber-900">संशोधित कुल स्टॉक वैल्यू:</span>
                <span className="font-mono font-bold text-amber-950 text-sm">
                  ₹{Math.round(editWheatQuintals * editWheatRate).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditWheatModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>गेहूँ स्टॉक अपडेट करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Direct Edit Packaging Material Stock (खाली बैग व धागा स्टॉक एडिट करें) */}
      {showEditPackagingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                <span>पैकिंग मटेरियल स्टॉक एडिट करें (Edit Packaging Bags)</span>
              </h3>
              <button onClick={() => setShowEditPackagingModal(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPackaging} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">5 KG खाली बैग (नग) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editBags5}
                    onChange={(e) => setEditBags5(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">10 KG खाली बैग (नग) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editBags10}
                    onChange={(e) => setEditBags10(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">25 KG खाली बैग (नग) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editBags25}
                    onChange={(e) => setEditBags25(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">50 KG खाली बोरी (नग) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editBags50}
                    onChange={(e) => setEditBags50(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">सिलाई धागा (Stitching Thread in KG) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={editThreadKg}
                  onChange={(e) => setEditThreadKg(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-purple-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditPackagingModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>पैकिंग स्टॉक अपडेट करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Master Quick Stock Editor (संपूर्ण स्टॉक मास्टर एडिट) */}
      {showMasterEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 text-xs text-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                <span>संपूर्ण गोदाम स्टॉक संशोधन (Master Stock Edit)</span>
              </h3>
              <button onClick={() => setShowMasterEditModal(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMasterEdit} className="overflow-y-auto p-1 space-y-5 my-3">
              {/* Raw Wheat Section */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                <span className="font-bold text-amber-900 block text-xs uppercase tracking-wider">
                  1. कच्चा गेहूँ स्टॉक (Raw Wheat)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">गेहूँ स्टॉक (क्विंटल)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editWheatQuintals}
                      onChange={(e) => setEditWheatQuintals(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">खरीद दर (₹ / क्विंटल)</label>
                    <input
                      type="number"
                      min="0"
                      value={editWheatRate}
                      onChange={(e) => setEditWheatRate(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Empty Bags Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                  2. खाली प्रिंटेड बैग्स व धागा
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">5 KG बैग</label>
                    <input
                      type="number"
                      min="0"
                      value={editBags5}
                      onChange={(e) => setEditBags5(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">10 KG बैग</label>
                    <input
                      type="number"
                      min="0"
                      value={editBags10}
                      onChange={(e) => setEditBags10(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">25 KG बैग</label>
                    <input
                      type="number"
                      min="0"
                      value={editBags25}
                      onChange={(e) => setEditBags25(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">50 KG बोरी</label>
                    <input
                      type="number"
                      min="0"
                      value={editBags50}
                      onChange={(e) => setEditBags50(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">धागा (KG)</label>
                    <input
                      type="number"
                      min="0"
                      value={editThreadKg}
                      onChange={(e) => setEditThreadKg(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center text-purple-700"
                    />
                  </div>
                </div>
              </div>

              {/* Ready Finished Atta Bags */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                  3. तैयार आटा बैग स्टॉक (Ready Finished Goods Bags)
                </span>
                
                <div className="space-y-3">
                  {products.map((p) => (
                    <div key={p.id} className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-900 text-xs block mb-2">{p.nameHindi} ({p.brand})</span>
                      <div className="grid grid-cols-4 gap-2">
                        {([5, 10, 25, 50] as BagSize[]).map((size) => {
                          const key = `${p.id}_${size}`;
                          return (
                            <div key={size}>
                              <span className="text-[10px] text-slate-500 font-bold block">{size} KG बैग</span>
                              <input
                                type="number"
                                min="0"
                                value={masterBagCounts[key] ?? 0}
                                onChange={(e) => setMasterBagCounts({
                                  ...masterBagCounts,
                                  [key]: Number(e.target.value) || 0,
                                })}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-center text-xs"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>यहाँ किए गए सभी बदलाव तुरंत LocalStorage में सेव हो जाएंगे और डैशबोर्ड पर लाइव अपडेट होंगे।</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMasterEditModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-50"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>सभी स्टॉक परिवर्तन सुरक्षित करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Inline Edit Single Ready Stock Bag Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              तैयार स्टॉक गिनती अपडेट करें ({editingItem.bagSize} KG)
            </h3>
            <p className="text-slate-500 mb-4">
              गोदाम में वास्तविक भौतिक गिनती के अनुसार बैग्स की संख्या दर्ज करें:
            </p>

            <div className="mb-4">
              <label className="block font-bold text-slate-700 mb-1">तैयार बैग संख्या (Bags Count)</label>
              <input
                type="number"
                min="0"
                value={editCount}
                onChange={(e) => setEditCount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-base"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 border rounded-xl font-semibold"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSaveEditStock}
                className="px-4 py-1.5 bg-amber-600 text-white font-bold rounded-xl flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>अपडेट करें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Mandi Wheat Purchase */}
      {showWheatModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Wheat className="w-5 h-5 text-amber-600" />
              <span>मंडी से कच्चा गेहूँ आवक दर्ज करें</span>
            </h3>

            <form onSubmit={handleAddWheat} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">आवक मात्रा (क्विंटल में) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={wheatQuintalsInput}
                  onChange={(e) => setWheatQuintalsInput(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  = {(wheatQuintalsInput * 100).toLocaleString('en-IN')} KG गेहूँ
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">मंडी खरीद दर (₹ प्रति क्विंटल) *</label>
                <input
                  type="number"
                  min="1000"
                  required
                  value={wheatRateInput}
                  onChange={(e) => setWheatRateInput(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-800 font-bold uppercase block">कुल आवक खरीद बिल राशि:</span>
                <span className="font-mono font-bold text-base text-amber-950">
                  ₹{(wheatQuintalsInput * wheatRateInput).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWheatModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                >
                  आवक सेव करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Add Empty Bags */}
      {showEmptyBagsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-700" />
              <span>खाली प्रिंटेड बैग्स आवक जोड़ें</span>
            </h3>

            <form onSubmit={handleAddEmptyBags} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">बैग साइज चुनें *</label>
                <select
                  value={emptyBagSizeInput}
                  onChange={(e) => setEmptyBagSizeInput(Number(e.target.value) as BagSize)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value={5}>5 KG छोटा बैग</option>
                  <option value={10}>10 KG मीडियम बैग</option>
                  <option value={25}>25 KG बड़ा बैग</option>
                  <option value={50}>50 KG होलसेल बोरी</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">बैग की संख्या (नग) *</label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  required
                  value={emptyBagCountInput}
                  onChange={(e) => setEmptyBagCountInput(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmptyBagsModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                >
                  बैग स्टॉक में जोड़ें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
