import React, { useState, useEffect } from 'react';
import { Customer, Order, CompanySettings, UserProfile } from '../types/erp';
import {
  Users,
  UserPlus,
  IndianRupee,
  Phone,
  MapPin,
  Share2,
  Search,
  Edit3,
  Trash2,
  AlertCircle,
  Save,
  X,
  Mail,
  Briefcase,
  Store,
  Camera,
  ImagePlus,
  ExternalLink,
  UserCheck,
  Map as MapIcon,
  Loader2,
} from 'lucide-react';
import { LocationPickerMap, CapturedMapLocation } from '../components/LocationPickerMap';
import { CustomersMapOverview } from '../components/CustomersMapOverview';
import { compressShopPhoto } from '../utils/imageCompress';
import { buildGoogleMapsPlaceUrl } from '../utils/mapsConfig';

interface CustomerViewProps {
  customers: Customer[];
  orders: Order[];
  settings: CompanySettings;
  staff?: UserProfile[];
  sectionMode?: 'all' | 'wholesale' | 'retail';
  canReceivePayment?: boolean;
  onOpenNewCustomer: (defaultType?: 'wholesaler' | 'retailer') => void;
  onOpenReceivePayment: (customerId?: string) => void;
  onSelectOrder: (order: Order) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customers,
  orders,
  settings,
  staff = [],
  sectionMode = 'all',
  canReceivePayment = true,
  onOpenNewCustomer,
  onOpenReceivePayment,
  onSelectOrder,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSalesmanId, setFilterSalesmanId] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showMapOverview, setShowMapOverview] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ firmName: string; url: string } | null>(null);

  useEffect(() => {
    setFilterType('all');
    setSelectedCustomerId(null);
  }, [sectionMode]);

  const salesmen = staff.filter((s) => s.role === 'salesman');

  // Scope customers according to active section (Wholesale vs Retail)
  const scopedCustomers = customers.filter((c) => {
    if (sectionMode === 'wholesale') return c.type === 'wholesaler';
    if (sectionMode === 'retail') return c.type !== 'wholesaler';
    return true;
  });

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFirmName, setEditFirmName] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editType, setEditType] = useState<'retailer' | 'wholesaler' | 'caterer' | 'direct'>('retailer');
  const [editGstin, setEditGstin] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState<number>(50000);
  const [editCurrentDue, setEditCurrentDue] = useState<number>(0);
  const [editSalesmanId, setEditSalesmanId] = useState<string>('');
  const [editLatitude, setEditLatitude] = useState<number | undefined>(undefined);
  const [editLongitude, setEditLongitude] = useState<number | undefined>(undefined);
  const [editPlaceId, setEditPlaceId] = useState<string | undefined>(undefined);
  const [editMapAddress, setEditMapAddress] = useState<string | undefined>(undefined);
  const [editGoogleMapsUrl, setEditGoogleMapsUrl] = useState<string | undefined>(undefined);
  const [editShopPhotoUrl, setEditShopPhotoUrl] = useState<string>('');
  const [editPhotoLoading, setEditPhotoLoading] = useState(false);

  // Delete Customer Confirmation State
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<Customer | null>(null);

  // Filter customers inside the section
  const filteredCustomers = scopedCustomers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.firmName.toLowerCase().includes(q) ||
      c.phone.includes(searchQuery) ||
      c.city.toLowerCase().includes(q) ||
      (c.salesmanName || '').toLowerCase().includes(q) ||
      (c.entryByName || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterSalesmanId === 'direct' && c.salesmanId) return false;
    if (filterSalesmanId !== 'all' && filterSalesmanId !== 'direct' && c.salesmanId !== filterSalesmanId) {
      return false;
    }

    if (filterType === 'dues') return c.currentDue > 0;
    if (filterType === 'located') return typeof c.latitude === 'number' && typeof c.longitude === 'number';
    if (filterType === 'retailer') return c.type === 'retailer';
    if (filterType === 'wholesaler') return c.type === 'wholesaler';
    if (filterType === 'caterer') return c.type === 'caterer';

    return true;
  });

  const totalDues = scopedCustomers.reduce((s, c) => s + c.currentDue, 0);
  const totalPurchases = scopedCustomers.reduce((s, c) => s + c.totalPurchased, 0);
  const locatedCount = scopedCustomers.filter(
    (c) => typeof c.latitude === 'number' && typeof c.longitude === 'number'
  ).length;

  const selectedCustomer = scopedCustomers.find((c) => c.id === selectedCustomerId);
  const customerOrders = orders.filter((o) => o.customerId === selectedCustomerId);

  const defaultModalType: 'wholesaler' | 'retailer' =
    sectionMode === 'wholesale' ? 'wholesaler' : 'retailer';

  // WhatsApp reminder message
  const handleSendReminder = (customer: Customer) => {
    const msg =
      `*श्री ${customer.name} जी* (${customer.firmName})%0A` +
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
    setEditEmail(cust.email || '');
    setEditAddress(cust.address);
    setEditCity(cust.city);
    setEditType(cust.type);
    setEditGstin(cust.gstin || '');
    setEditCreditLimit(cust.creditLimit);
    setEditCurrentDue(cust.currentDue);
    setEditSalesmanId(cust.salesmanId || '');
    setEditLatitude(cust.latitude);
    setEditLongitude(cust.longitude);
    setEditPlaceId(cust.placeId);
    setEditMapAddress(cust.mapAddress);
    setEditGoogleMapsUrl(cust.googleMapsUrl);
    setEditShopPhotoUrl(cust.shopPhotoUrl || '');
  };

  const handleEditMapCapture = (loc: CapturedMapLocation) => {
    setEditLatitude(loc.latitude);
    setEditLongitude(loc.longitude);
    if (loc.placeId) setEditPlaceId(loc.placeId);
    if (loc.mapAddress) setEditMapAddress(loc.mapAddress);
    setEditGoogleMapsUrl(
      loc.googleMapsUrl || buildGoogleMapsPlaceUrl(loc.latitude, loc.longitude, loc.placeId)
    );
    if (loc.address && (!editAddress.trim() || editAddress.trim().length < 5)) {
      setEditAddress(loc.address);
    }
    if (loc.city) {
      setEditCity(loc.city);
    }
  };

  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoLoading(true);
    try {
      const compressed = await compressShopPhoto(file);
      setEditShopPhotoUrl(compressed);
    } finally {
      setEditPhotoLoading(false);
      e.target.value = '';
    }
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !onUpdateCustomer) return;

    const matchedSalesman = salesmen.find((s) => s.id === editSalesmanId);

    const updated: Customer = {
      ...editingCustomer,
      firmName: editFirmName.trim(),
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim() || undefined,
      address: editAddress.trim(),
      city: editCity.trim(),
      type: editType,
      gstin: editGstin.trim() ? editGstin.trim().toUpperCase() : undefined,
      creditLimit: Number(editCreditLimit) || 0,
      currentDue: Number(editCurrentDue) || 0,
      salesmanId: editSalesmanId || undefined,
      salesmanName: matchedSalesman?.name || (editSalesmanId ? editingCustomer.salesmanName : undefined),
      latitude: editLatitude,
      longitude: editLongitude,
      placeId: editPlaceId,
      mapAddress: editMapAddress,
      googleMapsUrl:
        editGoogleMapsUrl ||
        (typeof editLatitude === 'number' && typeof editLongitude === 'number'
          ? buildGoogleMapsPlaceUrl(editLatitude, editLongitude, editPlaceId)
          : undefined),
      shopPhotoUrl: editType === 'wholesaler' && editShopPhotoUrl ? editShopPhotoUrl : undefined,
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

  const isWholesaleSection = sectionMode === 'wholesale';
  const isRetailSection = sectionMode === 'retail';

  return (
    <div className="space-y-6 pb-12">
      {/* Header & KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {isWholesaleSection ? (
              <Store className="w-6 h-6 text-blue-700" />
            ) : (
              <Users className="w-6 h-6 text-amber-600" />
            )}
            <span>
              {isWholesaleSection
                ? 'होलसेल डीलर्स प्रबंधन (Wholesale Dealers)'
                : isRetailSection
                ? 'रिटेल कस्टमर प्रबंधन (Retail Customers)'
                : 'ग्राहक खाता प्रबंधन (Customers)'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isWholesaleSection
              ? 'होलसेल मंडी आढ़तिया खाते, दुकान फोटो, Google Maps GPS लोकेशन, Entry By व सेल्समैन लिंक'
              : isRetailSection
              ? 'किराना दुकानदार, कैटरर्स व सीधे ग्राहक — पता, Google Maps लोकेशन, Entry By व बकाया नियंत्रण'
              : 'किराना दुकानदार, होलसेल मंडी आढ़तिया, कैटरर्स खाता एवं बकाया नियंत्रण'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMapOverview(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <MapIcon className="w-4 h-4 text-amber-400" />
            <span>मैप पर देखें ({locatedCount})</span>
          </button>

          {canReceivePayment && (
            <button
              type="button"
              onClick={() => onOpenReceivePayment()}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <IndianRupee className="w-4 h-4" />
              <span>भुगतान प्राप्त करें</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenNewCustomer(defaultModalType)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
              isWholesaleSection
                ? 'bg-blue-700 hover:bg-blue-800'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {isWholesaleSection
                ? '+ नया होलसेल डीलर जोड़ें'
                : isRetailSection
                ? '+ नया रिटेल कस्टमर जोड़ें'
                : '+ नया ग्राहक जोड़ें'}
            </span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">
            {isWholesaleSection ? 'डीलर्स पर कुल बकाया' : 'कस्टमर्स पर कुल बकाया'}
          </span>
          <span className="font-mono font-black text-2xl text-rose-600 block mt-1">
            ₹{totalDues.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500">
            {scopedCustomers.filter((c) => c.currentDue > 0).length} खातों से वसूली बाकी है
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">
            {isWholesaleSection ? 'कुल होलसेल डीलर खाते' : isRetailSection ? 'कुल रिटेल कस्टमर खाते' : 'कुल पंजीकृत खाते'}
          </span>
          <span className="font-mono font-black text-2xl text-slate-900 block mt-1">
            {scopedCustomers.length}
          </span>
          <span className="text-[11px] text-slate-500">
            📍 {locatedCount} खातों की Google Map लोकेशन सेव है
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">कुल लाइफटाइम बिक्री</span>
          <span className="font-mono font-black text-2xl text-emerald-700 block mt-1">
            ₹{totalPurchases.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500">
            इस श्रेणी की कुल खरीदारी
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
            placeholder="नाम, दुकान, शहर, Entry By या मोबाइल खोजें..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            सभी ({scopedCustomers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('dues')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'dues'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            बकायादार ({scopedCustomers.filter((c) => c.currentDue > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('located')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'located'
                ? 'bg-blue-700 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            📍 मैप पिन ({locatedCount})
          </button>

          {sectionMode !== 'wholesale' && (
            <>
              <button
                type="button"
                onClick={() => setFilterType('retailer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  filterType === 'retailer'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                किराना
              </button>
              <button
                type="button"
                onClick={() => setFilterType('caterer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  filterType === 'caterer'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                कैटरर्स
              </button>
            </>
          )}

          {sectionMode === 'all' && (
            <button
              type="button"
              onClick={() => setFilterType('wholesaler')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterType === 'wholesaler'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              होलसेलर
            </button>
          )}

          <select
            value={filterSalesmanId}
            onChange={(e) => setFilterSalesmanId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 border border-amber-300 text-amber-950"
            title="सेल्समैन के अनुसार फ़िल्टर करें"
          >
            <option value="all">सभी सेल्समैन / डायरेक्ट</option>
            <option value="direct">डायरेक्ट (बिना सेल्समैन)</option>
            {salesmen.map((sm) => (
              <option key={sm.id} value={sm.id}>
                सेल्समैन: {sm.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">फर्म व व्यापारी / Entry By</th>
                <th className="py-3 px-3">संपर्क, पता व Google Map</th>
                <th className="py-3 px-3 text-center">प्रकार</th>
                <th className="py-3 px-3 text-right">कुल खरीद</th>
                <th className="py-3 px-3 text-right">वर्तमान बकाया (Due)</th>
                <th className="py-3 px-3 text-right">उधार सीमा</th>
                <th className="py-3 px-4 text-center">कार्रवाई (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    इस श्रेणी में कोई खाता नहीं मिला। ऊपर बटन से नया खाता जोड़ें।
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isOverLimit = cust.currentDue > cust.creditLimit;
                  const hasCoords =
                    typeof cust.latitude === 'number' && typeof cust.longitude === 'number';
                  const mapsLink =
                    cust.googleMapsUrl ||
                    (hasCoords
                      ? buildGoogleMapsPlaceUrl(
                          cust.latitude as number,
                          cust.longitude as number,
                          cust.placeId
                        )
                      : undefined);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          {cust.type === 'wholesaler' && cust.shopPhotoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxPhoto({
                                  firmName: cust.firmName,
                                  url: cust.shopPhotoUrl!,
                                })
                              }
                              title="दुकान की फोटो बड़ा करके देखें"
                              className="w-11 h-11 rounded-xl overflow-hidden border-2 border-blue-300 shrink-0 hover:scale-105 transition cursor-pointer"
                            >
                              <img
                                src={cust.shopPhotoUrl}
                                alt={cust.firmName}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center shrink-0 text-sm ${
                                cust.type === 'wholesaler'
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {cust.firmName.charAt(0)}
                            </div>
                          )}

                          <div>
                            <span className="font-bold text-slate-900 block text-sm">
                              {cust.firmName}
                            </span>
                            <span className="text-[11px] text-slate-600 font-medium block">
                              श्री {cust.name} {cust.gstin ? `• GST: ${cust.gstin}` : ''}
                            </span>

                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {cust.entryByName && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                  <UserCheck className="w-2.5 h-2.5" />
                                  <span>Entry By: {cust.entryByName}</span>
                                </span>
                              )}

                              {cust.salesmanName && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                                  <Briefcase className="w-2.5 h-2.5" />
                                  <span>सेल्समैन: {cust.salesmanName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-600 space-y-0.5">
                          <p className="flex items-center gap-1 font-mono font-medium text-slate-900">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>+91 {cust.phone}</span>
                          </p>
                          {cust.email && (
                            <p className="flex items-center gap-1 text-[11px] text-slate-600">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{cust.email}</span>
                            </p>
                          )}
                          <p className="flex items-start gap-1 text-[11px] text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>
                              {cust.address}, {cust.city}
                            </span>
                          </p>
                          {mapsLink && (
                            <a
                              href={mapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold"
                            >
                              <MapPin className="w-2.5 h-2.5 text-rose-600" />
                              <span>Google Maps लोकेशन</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.type === 'wholesaler'
                              ? 'bg-blue-100 text-blue-800'
                              : cust.type === 'retailer'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {cust.type === 'wholesaler'
                            ? 'होलसेल डीलर'
                            : cust.type === 'retailer'
                            ? 'रिटेल किराना'
                            : cust.type.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                        ₹{cust.totalPurchased.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`font-black text-sm block ${
                            cust.currentDue > 0 ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
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
                              type="button"
                              onClick={() => handleSendReminder(cust)}
                              title="WhatsApp पर बकाया तगादा भेजें"
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canReceivePayment && (
                            <button
                              type="button"
                              onClick={() => onOpenReceivePayment(cust.id)}
                              title="भुगतान दर्ज करें"
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            >
                              वसूलें
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedCustomerId(cust.id)}
                            title="बिलिंग इतिहास देखें"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                          >
                            लेजर
                          </button>

                          {onUpdateCustomer && (
                            <button
                              type="button"
                              onClick={() => startEditCustomer(cust)}
                              title="ग्राहक विवरण एडिट करें"
                              className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            </button>
                          )}

                          {onDeleteCustomer && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmCustomer(cust)}
                              title="खाता सूची से हटाएं"
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-700 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wholesale Shop Photo Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
              <span>होलसेल दुकान फोटो: {lightboxPhoto.firmName}</span>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.firmName}
              className="w-full max-h-[70vh] object-contain bg-slate-100"
            />
          </div>
        </div>
      )}

      {/* Interactive Customers Google Map Overview */}
      {showMapOverview && (
        <CustomersMapOverview
          customers={filteredCustomers}
          title={
            isWholesaleSection
              ? 'होलसेल डीलर्स लोकेशन मैप (Wholesale Dealers Map)'
              : isRetailSection
              ? 'रिटेल कस्टमर्स लोकेशन मैप (Retail Customers Map)'
              : 'सभी ग्राहक व डीलर्स लोकेशन मैप'
          }
          onClose={() => setShowMapOverview(false)}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-slate-200 text-xs text-slate-800 max-h-[94vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                  <span>ग्राहक / डीलर विवरण एडिट करें</span>
                </h3>
                {editingCustomer.entryByName && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    Entry By: {editingCustomer.entryByName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
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
                  <label className="block font-bold text-slate-700 mb-1">ग्राहक श्रेणी (Account Type) *</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="wholesaler">होलसेल डीलर / आढ़तिया (Wholesaler)</option>
                    <option value="retailer">रिटेल किराना स्टोर (Retailer)</option>
                    <option value="caterer">हलवाई व कैटरर्स (Caterer)</option>
                    <option value="direct">सीधा उपभोक्ता (Direct)</option>
                  </select>
                </div>
              </div>

              {/* Wholesale Shop Photo Editor */}
              {editType === 'wholesaler' && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-700" />
                      <span>होलसेल दुकान फोटो (Shop Photo)</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <label className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                        <Camera className="w-3 h-3" />
                        <span>कैमरा</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleEditPhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-blue-300 text-blue-900 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                        <ImagePlus className="w-3 h-3" />
                        <span>गैलरी</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditPhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  {editPhotoLoading && (
                    <div className="flex items-center gap-1.5 text-blue-800 text-[11px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>फोटो प्रोसेस हो रही है...</span>
                    </div>
                  )}
                  {editShopPhotoUrl && (
                    <div className="relative inline-block">
                      <img
                        src={editShopPhotoUrl}
                        alt="Shop preview"
                        className="h-28 w-44 object-cover rounded-xl border border-blue-300"
                      />
                      <button
                        type="button"
                        onClick={() => setEditShopPhotoUrl('')}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">ईमेल पता (Email - वैकल्पिक)</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="उदा. partyname@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
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

              {/* Interactive Google Maps Location Picker inside Edit Modal */}
              <LocationPickerMap
                latitude={editLatitude}
                longitude={editLongitude}
                address={editAddress}
                city={editCity}
                firmName={editFirmName}
                onLocationChange={handleEditMapCapture}
              />

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

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                <label className="flex items-center gap-1.5 font-bold text-amber-950 mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                  <span>नियुक्त सेल्समैन (Assigned Salesman)</span>
                </label>
                <select
                  value={editSalesmanId}
                  onChange={(e) => setEditSalesmanId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">डायरेक्ट ग्राहक (कोई सेल्समैन नहीं)</option>
                  {salesmen.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.name} ({sm.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>जानकारी सुरक्षित करें</span>
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
              खाता डिलीट करें?
            </h3>

            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              क्या आप सचमुच <strong>{deleteConfirmCustomer.firmName}</strong> (श्री {deleteConfirmCustomer.name}) का खाता हमेशा के लिए हटाना चाहते हैं?
            </p>

            {deleteConfirmCustomer.currentDue > 0 && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-center space-y-1">
                <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
                <span className="font-bold block">
                  चेतावनी: इस खाते पर ₹{deleteConfirmCustomer.currentDue.toLocaleString('en-IN')} की बकाया उधारी है!
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
          <div className="flex flex-wrap justify-between items-start gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-start gap-3">
              {selectedCustomer.type === 'wholesaler' && selectedCustomer.shopPhotoUrl && (
                <img
                  src={selectedCustomer.shopPhotoUrl}
                  alt={selectedCustomer.firmName}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-blue-300 shrink-0"
                />
              )}
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700">खाता लेजर विवरण</span>
                <h3 className="text-lg font-black text-slate-900">{selectedCustomer.firmName}</h3>
                <p className="text-xs text-slate-600">
                  श्री {selectedCustomer.name} | फोन: +91 {selectedCustomer.phone}
                  {selectedCustomer.email ? ` | ईमेल: ${selectedCustomer.email}` : ''} | पता:{' '}
                  {selectedCustomer.address}, {selectedCustomer.city}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {selectedCustomer.entryByName && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                      Entry By: {selectedCustomer.entryByName}
                    </span>
                  )}
                  {selectedCustomer.salesmanName && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
                      सेल्समैन: {selectedCustomer.salesmanName}
                    </span>
                  )}
                  {typeof selectedCustomer.latitude === 'number' &&
                    typeof selectedCustomer.longitude === 'number' && (
                      <a
                        href={
                          selectedCustomer.googleMapsUrl ||
                          buildGoogleMapsPlaceUrl(
                            selectedCustomer.latitude,
                            selectedCustomer.longitude,
                            selectedCustomer.placeId
                          )
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3 text-rose-600" />
                        <span>Google Maps लोकेशन खोलें</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onUpdateCustomer && (
                <button
                  type="button"
                  onClick={() => startEditCustomer(selectedCustomer)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-300"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>एडिट करें</span>
                </button>
              )}
              {onDeleteCustomer && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCustomer(selectedCustomer)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>डिलीट</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSendReminder(selectedCustomer)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp तगादा</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                बंद करें
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
              इस खाते के सभी बिल एवं ऑर्डर्स:
            </h4>
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
                    {customerOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {order.invoiceNumber}
                        </td>
                        <td className="py-2 px-3">{order.date}</td>
                        <td className="py-2 px-3 uppercase text-[10px] font-bold">{order.billType}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">₹{order.totalAmount}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700">₹{order.paidAmount}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          ₹{order.dueAmount}
                        </td>
                        <td className="py-2 px-3 text-center uppercase text-[10px] font-bold">
                          {order.status}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
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
