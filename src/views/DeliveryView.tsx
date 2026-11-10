import React, { useState } from 'react';
import { Order, OrderStatus } from '../types/erp';
import { 
  Truck, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  IndianRupee, 
  FileText,
  AlertCircle,
  Navigation
} from 'lucide-react';

interface DeliveryViewProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onSelectOrder: (order: Order) => void;
}

export const DeliveryView: React.FC<DeliveryViewProps> = ({
  orders,
  onUpdateOrderStatus,
  onSelectOrder,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'dispatched' | 'delivered'>('all');

  const deliveryOrders = orders.filter(o => {
    if (activeFilter === 'ready') return o.status === 'ready_dispatch';
    if (activeFilter === 'dispatched') return o.status === 'dispatched';
    if (activeFilter === 'delivered') return o.status === 'delivered';
    return o.status === 'ready_dispatch' || o.status === 'dispatched' || o.status === 'delivered';
  });

  const readyCount = orders.filter(o => o.status === 'ready_dispatch').length;
  const dispatchedCount = orders.filter(o => o.status === 'dispatched').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            <span>डिलीवरी एवं डिस्पैच ट्रैकिंग (Delivery Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            गाड़ियों में लोडिंग, डिलीवरी ड्राइवर, रास्ते में लाइव स्थिति और दुकान पर भुगतान वसूली
          </p>
        </div>

        {/* Vehicle Badge */}
        <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl flex items-center gap-2.5 text-xs shadow-xs">
          <Truck className="w-4 h-4 text-amber-400" />
          <div>
            <span className="font-bold text-slate-200">पिकअप वाहन:</span>
            <span className="font-mono font-bold text-amber-400 ml-1.5">RJ-14-GA-4521</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setActiveFilter('dispatched')}
          className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
            activeFilter === 'dispatched' ? 'bg-purple-50 border-purple-500 shadow-sm' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-purple-900 uppercase">गाड़ी रवाना / रास्ते में</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <span className="font-mono font-black text-2xl text-purple-800 block mt-1">
            {dispatchedCount}
          </span>
          <span className="text-[11px] text-purple-700">ग्राहकों की दुकानों पर जाने हेतु ऑन-वे</span>
        </div>

        <div 
          onClick={() => setActiveFilter('ready')}
          className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
            activeFilter === 'ready' ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-blue-900 uppercase">गोदाम में डिस्पैच तैयार</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-mono font-black text-2xl text-blue-800 block mt-1">
            {readyCount}
          </span>
          <span className="text-[11px] text-blue-700">गाड़ी में लोड होने की प्रतीक्षा में</span>
        </div>

        <div 
          onClick={() => setActiveFilter('delivered')}
          className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
            activeFilter === 'delivered' ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-emerald-900 uppercase">सफलतापूर्वक डिलीवर</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-mono font-black text-2xl text-emerald-800 block mt-1">
            {deliveredCount}
          </span>
          <span className="text-[11px] text-emerald-700">माल पहुंच गया व भुगतान प्राप्त</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          सभी सक्रिय डिलीवरी
        </button>
        <button
          onClick={() => setActiveFilter('dispatched')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeFilter === 'dispatched' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          केवल रास्ते में (In Transit)
        </button>
        <button
          onClick={() => setActiveFilter('ready')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeFilter === 'ready' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          डिस्पैच तैयार
        </button>
        <button
          onClick={() => setActiveFilter('delivered')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            activeFilter === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          डिलीवर पूर्ण
        </button>
      </div>

      {/* Delivery Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deliveryOrders.map((order) => {
          const totalBags = order.items.reduce((s, i) => s + i.quantity, 0);

          return (
            <div 
              key={order.id} 
              className={`bg-white rounded-2xl p-5 border-2 shadow-xs transition space-y-4 ${
                order.status === 'dispatched' 
                  ? 'border-purple-300 ring-2 ring-purple-100' 
                  : order.status === 'ready_dispatch'
                  ? 'border-blue-200'
                  : 'border-slate-200 opacity-90'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {order.invoiceNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      order.status === 'dispatched'
                        ? 'bg-purple-100 text-purple-800'
                        : order.status === 'ready_dispatch'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {order.status === 'dispatched' ? 'गाड़ी रास्ते में' : order.status === 'ready_dispatch' ? 'डिस्पैच तैयार' : 'डिलीवर हो गया'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-1">
                    {order.customerFirm}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">श्री {order.customerName}</p>
                </div>

                <button
                  onClick={() => onSelectOrder(order)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>बिल</span>
                </button>
              </div>

              {/* Delivery Details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                <p className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{order.customerAddress}</span>
                </p>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/80">
                  <span className="text-slate-500">वाहन व ड्राइवर:</span>
                  <span className="font-medium text-slate-900">
                    {order.deliveryStaffName || 'सोनू सैनी'} ({order.vehicleNumber || 'RJ-14-GA-4521'})
                  </span>
                </div>
              </div>

              {/* Order Items & Amounts */}
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 block">कुल सामान:</span>
                  <span className="font-bold text-slate-900">{totalBags} बैग आटा</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-right">बिल राशि:</span>
                  <span className="font-mono font-bold text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-right">वसूलना बाकी:</span>
                  <span className={`font-mono font-black ${order.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    ₹{order.dueAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                <a
                  href={`tel:${order.customerPhone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>कॉल करें</span>
                </a>

                <div className="flex items-center gap-2">
                  {order.status === 'ready_dispatch' && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, 'dispatched')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>गाड़ी में लोड कर रवाना करें</span>
                    </button>
                  )}

                  {order.status === 'dispatched' && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>दुकान पर डिलीवर मार्क करें</span>
                    </button>
                  )}

                  {order.status === 'delivered' && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>सफलतापूर्वक डिलीवर हो चुका</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
