import React, { useState } from 'react';
import { Customer, UserProfile } from '../types/erp';
import {
  X,
  UserPlus,
  CheckCircle2,
  Briefcase,
  Store,
  Users,
  Camera,
  ImagePlus,
  Trash2,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { LocationPickerMap, CapturedMapLocation } from './LocationPickerMap';
import { compressShopPhoto } from '../utils/imageCompress';
import { buildGoogleMapsPlaceUrl } from '../utils/mapsConfig';

interface NewCustomerModalProps {
  staff?: UserProfile[];
  activeStaffMember?: UserProfile;
  defaultType?: 'wholesaler' | 'retailer';
  onClose: () => void;
  onSubmit: (customer: Customer) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  staff = [],
  activeStaffMember,
  defaultType = 'retailer',
  onClose,
  onSubmit,
}) => {
  const salesmen = staff.filter((s) => s.role === 'salesman' && s.active);
  const isLoggedInSalesman = activeStaffMember?.role === 'salesman';

  const [name, setName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('जयपुर');
  const [gstin, setGstin] = useState('');
  const [type, setType] = useState<'retailer' | 'wholesaler' | 'caterer' | 'direct'>(
    defaultType === 'wholesaler' ? 'wholesaler' : 'retailer'
  );
  const [creditLimit, setCreditLimit] = useState(
    defaultType === 'wholesaler' ? 150000 : 50000
  );
  const [openingDue, setOpeningDue] = useState(0);
  const [salesmanId, setSalesmanId] = useState<string>(
    isLoggedInSalesman && activeStaffMember ? activeStaffMember.id : ''
  );

  // Google Maps Captured Location
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [mapAddress, setMapAddress] = useState<string | undefined>(undefined);
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string | undefined>(undefined);

  // Wholesale Shop Photo
  const [shopPhotoUrl, setShopPhotoUrl] = useState<string>('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const isWholesaler = type === 'wholesaler';

  const handleCategorySwitch = (nextCategory: 'wholesaler' | 'retailer') => {
    setType(nextCategory);
    if (nextCategory === 'wholesaler' && creditLimit === 50000) {
      setCreditLimit(150000);
    } else if (nextCategory === 'retailer' && creditLimit === 150000) {
      setCreditLimit(50000);
    }
  };

  const handleMapLocationCaptured = (loc: CapturedMapLocation) => {
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    if (loc.placeId) setPlaceId(loc.placeId);
    if (loc.mapAddress) setMapAddress(loc.mapAddress);
    setGoogleMapsUrl(
      loc.googleMapsUrl || buildGoogleMapsPlaceUrl(loc.latitude, loc.longitude, loc.placeId)
    );
    if (loc.address && (!address.trim() || address.trim().length < 5)) {
      setAddress(loc.address);
    }
    if (loc.city) {
      setCity(loc.city);
    }
  };

  const handleShopPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      const compressed = await compressShopPhoto(file);
      setShopPhotoUrl(compressed);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'फ़ोटो अपलोड नहीं हो सकी।');
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedSalesman =
      salesmen.find((s) => s.id === salesmanId) ||
      (isLoggedInSalesman && activeStaffMember?.id === salesmanId ? activeStaffMember : undefined);

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      firmName: firmName.trim() || name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
      type,
      totalOrders: 0,
      totalPurchased: openingDue,
      totalPaid: 0,
      currentDue: openingDue,
      creditLimit: Number(creditLimit) || (isWholesaler ? 150000 : 50000),
      lastOrderDate: new Date().toISOString().slice(0, 10),
      salesmanId: salesmanId || undefined,
      salesmanName: matchedSalesman?.name || undefined,
      latitude,
      longitude,
      placeId,
      mapAddress,
      googleMapsUrl:
        googleMapsUrl ||
        (typeof latitude === 'number' && typeof longitude === 'number'
          ? buildGoogleMapsPlaceUrl(latitude, longitude, placeId)
          : undefined),
      shopPhotoUrl: isWholesaler && shopPhotoUrl ? shopPhotoUrl : undefined,
      entryByStaffId: activeStaffMember?.id || undefined,
      entryByName: activeStaffMember?.name || undefined,
      entryByRole: activeStaffMember?.role || undefined,
    };

    onSubmit(newCustomer);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[94vh] flex flex-col">
        <div
          className={`text-white px-6 py-4 flex items-center justify-between shrink-0 ${
            isWholesaler
              ? 'bg-gradient-to-r from-blue-700 to-indigo-800'
              : 'bg-gradient-to-r from-amber-600 to-amber-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {isWholesaler ? (
              <Store className="w-5 h-5 text-blue-200" />
            ) : (
              <UserPlus className="w-5 h-5 text-amber-200" />
            )}
            <div>
              <h3 className="font-bold text-base">
                {isWholesaler
                  ? 'नया होलसेल डीलर खाता जोड़ें (Wholesale Dealer)'
                  : 'नया रिटेल कस्टमर खाता जोड़ें (Retail Customer)'}
              </h3>
              {activeStaffMember && (
                <p className="text-[11px] text-white/85">
                  Entry By: <strong>{activeStaffMember.name}</strong> ({activeStaffMember.roleHindi})
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs text-slate-800 overflow-y-auto">
          {/* Segmented Account Type Selector */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleCategorySwitch('wholesaler')}
              className={`p-3 rounded-xl border-2 text-left transition flex items-center gap-2.5 cursor-pointer ${
                isWholesaler
                  ? 'bg-blue-50 border-blue-600 text-blue-950 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isWholesaler ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <Store className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-xs block">होलसेल डीलर (Wholesale)</span>
                <span className="text-[10px] opacity-80 block">मंडी आढ़तिया • दुकान फोटो + मैप पिन</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySwitch('retailer')}
              className={`p-3 rounded-xl border-2 text-left transition flex items-center gap-2.5 cursor-pointer ${
                !isWholesaler
                  ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  !isWholesaler ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-xs block">रिटेल कस्टमर (Retail)</span>
                <span className="text-[10px] opacity-80 block">किराना दुकान / कैटरर्स / सीधा ग्राहक</span>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isWholesaler ? 'डीलर फर्म / मंडी दुकान का नाम *' : 'दुकान / फर्म का नाम *'}
              </label>
              <input
                type="text"
                required
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder={isWholesaler ? 'उदा. गोयल ट्रेडर्स व आढ़तिया' : 'उदा. श्री श्याम किराना स्टोर्स'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">व्यापारी / मालिक का नाम *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="उदा. मदनलाल जी"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">मोबाइल नंबर (WhatsApp) *</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98290XXXXX"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            {!isWholesaler ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">रिटेल उप-श्रेणी *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="retailer">किराना दुकानदार (Retailer)</option>
                  <option value="caterer">हलवाई / कैटरर्स / होटल</option>
                  <option value="direct">सीधा ग्राहक (Direct)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN नंबर (वैकल्पिक)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="08XXXXX0000X1ZX"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">ईमेल पता (वैकल्पिक)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="party@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Wholesale Dealer Shop Photo Section */}
          {isWholesaler && (
            <div className="bg-blue-50/70 border-2 border-blue-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-700" />
                    <span>होलसेल दुकान की फोटो (Wholesale Shop Photo)</span>
                  </span>
                  <span className="text-[10px] text-blue-800 block">
                    कैमरे से फोटो खींचें या गैलरी से चुनें (डिलीवरी व वेरिफिकेशन के लिए खाता में सेव होगी)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <span>फोटो खींचें</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleShopPhotoFile}
                      className="hidden"
                    />
                  </label>
                  <label className="px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-blue-300 text-blue-900 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>गैलरी से चुनें</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleShopPhotoFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {photoLoading && (
                <div className="flex items-center gap-2 text-blue-800 text-[11px]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>दुकान की फोटो कम्प्रेस व तैयार की जा रही है...</span>
                </div>
              )}

              {photoError && (
                <p className="text-rose-600 font-semibold text-[11px]">{photoError}</p>
              )}

              {shopPhotoUrl && (
                <div className="relative inline-block">
                  <img
                    src={shopPhotoUrl}
                    alt="Wholesale Shop"
                    className="h-32 w-48 object-cover rounded-xl border-2 border-blue-300 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShopPhotoUrl('')}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg shadow-md hover:bg-rose-700 cursor-pointer"
                    title="फ़ोटो हटाएं"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">दुकान / प्रतिष्ठान का पूरा पता *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="दुकान नं., बाजार का नाम, लैंडमार्क"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">शहर / कस्बा *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Interactive Google Maps Live Location Capture */}
          <LocationPickerMap
            latitude={latitude}
            longitude={longitude}
            address={address}
            city={city}
            firmName={firmName}
            onLocationChange={handleMapLocationCaptured}
          />

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">उधार सीमा / Credit Limit (₹)</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">पुरानी बकाया राशि (Opening Due ₹)</label>
              <input
                type="number"
                value={openingDue}
                onChange={(e) => setOpeningDue(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-rose-600 font-bold"
              />
            </div>
          </div>

          {/* Entry By + Salesman Field Attribution */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2">
            {activeStaffMember && (
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-200/80 text-[11px]">
                <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Entry By (खाता जोड़ने वाला):</span>
                </span>
                <span className="px-2 py-0.5 bg-white border border-amber-300 rounded-lg font-black text-amber-950">
                  {activeStaffMember.name} ({activeStaffMember.roleHindi})
                </span>
              </div>
            )}

            <label className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
              <Briefcase className="w-3.5 h-3.5 text-amber-700" />
              <span>लिंक्ड सेल्समैन (Salesman Ledger Mapping)</span>
            </label>
            {isLoggedInSalesman && activeStaffMember ? (
              <div className="px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900">
                ✓ यह खाता सीधे आपके नाम ({activeStaffMember.name}) में जुड़ेगा — इसके सभी ऑर्डर व डिलीवर कमीशन आपके सेल्समैन खाते में स्वतः जुड़ेंगे।
              </div>
            ) : (
              <>
                <select
                  value={salesmanId}
                  onChange={(e) => setSalesmanId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">डायरेक्ट फैक्ट्री खाता (कोई सेल्समैन नहीं)</option>
                  {salesmen.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      सेल्समैन: {sm.name} ({sm.phone})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-900/80">
                  सेल्समैन चुनने पर इस {isWholesaler ? 'डीलर' : 'कस्टमर'} के सभी ऑर्डर व डिलीवरी कमीशन उस सेल्समैन के खाते में अपने-आप जुड़ेंगे।
                </p>
              </>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-100 font-semibold cursor-pointer"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isWholesaler
                  ? 'bg-blue-700 hover:bg-blue-800'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isWholesaler ? 'होलसेल डीलर खाता खोलें' : 'रिटेल कस्टमर खाता खोलें'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
