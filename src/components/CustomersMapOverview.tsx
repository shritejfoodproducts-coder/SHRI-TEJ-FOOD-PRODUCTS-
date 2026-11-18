import React, { useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { Customer } from '../types/erp';
import { X, MapPin, ExternalLink, Store, Users, Briefcase, Phone } from 'lucide-react';
import { buildGoogleMapsPlaceUrl, useGoogleMapsConfig } from '../utils/mapsConfig';

interface CustomersMapOverviewProps {
  customers: Customer[];
  title: string;
  onClose: () => void;
}

const CustomerMapPinMarker: React.FC<{
  customer: Customer;
  isSelected: boolean;
  onSelect: () => void;
  onCloseWindow: () => void;
}> = ({ customer, isSelected, onSelect, onCloseWindow }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  if (typeof customer.latitude !== 'number' || typeof customer.longitude !== 'number') {
    return null;
  }

  const isWholesale = customer.type === 'wholesaler';
  const position = { lat: customer.latitude, lng: customer.longitude };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={onSelect}
        title={customer.firmName}
      >
        <Pin
          background={isWholesale ? '#1d4ed8' : '#d97706'}
          borderColor={isWholesale ? '#1e3a8a' : '#92400e'}
          glyphColor="#ffffff"
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={260} onCloseClick={onCloseWindow}>
          <div className="p-1 text-xs text-slate-800 space-y-1.5">
            {isWholesale && customer.shopPhotoUrl && (
              <img
                src={customer.shopPhotoUrl}
                alt={customer.firmName}
                className="w-full h-24 object-cover rounded-lg border border-slate-200"
              />
            )}
            <div className="flex items-center justify-between gap-1">
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  isWholesale ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isWholesale ? 'होलसेल डीलर' : 'रिटेल कस्टमर'}
              </span>
              {customer.currentDue > 0 && (
                <span className="font-mono font-bold text-rose-600 text-[11px]">
                  बकाया: ₹{customer.currentDue.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <h4 className="font-black text-slate-900 text-sm leading-tight">
              {customer.firmName}
            </h4>
            <p className="text-[11px] text-slate-600">श्री {customer.name}</p>
            <p className="text-[11px] text-slate-600 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>+91 {customer.phone}</span>
            </p>
            <p className="text-[10px] text-slate-500">
              {customer.address}, {customer.city}
            </p>
            {(customer.entryByName || customer.salesmanName) && (
              <div className="text-[10px] text-indigo-800 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1">
                <Briefcase className="w-3 h-3 shrink-0" />
                <span>
                  {customer.entryByName
                    ? `Entry By: ${customer.entryByName}`
                    : `सेल्समैन: ${customer.salesmanName}`}
                </span>
              </div>
            )}
            <a
              href={
                customer.googleMapsUrl ||
                buildGoogleMapsPlaceUrl(customer.latitude, customer.longitude, customer.placeId)
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline pt-0.5"
            >
              <span>Google Maps में रास्ता खोलें</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const CustomersMapOverview: React.FC<CustomersMapOverviewProps> = ({
  customers,
  title,
  onClose,
}) => {
  const mapsConfig = useGoogleMapsConfig();
  const locatedCustomers = customers.filter(
    (c) =>
      typeof c.latitude === 'number' &&
      typeof c.longitude === 'number' &&
      Number.isFinite(c.latitude) &&
      Number.isFinite(c.longitude)
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    locatedCustomers[0]?.id || null
  );

  const defaultCenter =
    locatedCustomers.length > 0
      ? {
          lat: locatedCustomers[0].latitude as number,
          lng: locatedCustomers[0].longitude as number,
        }
      : { lat: 26.9124, lng: 75.7873 };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>{title}</span>
            </h3>
            <p className="text-[11px] text-slate-300">
              मैप पर पिन किए गए खाते: <strong>{locatedCustomers.length}</strong> / {customers.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-blue-800">
            <span className="w-3 h-3 rounded-full bg-blue-700 inline-block"></span>
            <Store className="w-3.5 h-3.5" />
            <span>होलसेल डीलर ({locatedCustomers.filter((c) => c.type === 'wholesaler').length})</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-800">
            <span className="w-3 h-3 rounded-full bg-amber-600 inline-block"></span>
            <Users className="w-3.5 h-3.5" />
            <span>रिटेल कस्टमर ({locatedCustomers.filter((c) => c.type !== 'wholesaler').length})</span>
          </span>
        </div>

        <div className="flex-1 min-h-[380px] h-[60vh] relative bg-slate-100">
          {!mapsConfig.apiKey ? (
            <div className="h-full flex items-center justify-center p-6 text-center text-xs text-slate-600">
              Google Maps API कुंजी उपलब्ध नहीं है।
            </div>
          ) : locatedCustomers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500 space-y-2">
              <MapPin className="w-8 h-8 text-slate-300" />
              <p className="font-bold text-slate-700">अभी किसी खाते की Google Map लोकेशन सेव नहीं है।</p>
              <p>नया खाता जोड़ते समय या एडिट करते समय GPS/Map लोकेशन सेव करें।</p>
            </div>
          ) : (
            <APIProvider
              apiKey={mapsConfig.apiKey}
              libraries={['marker']}
              language="hi"
              region="IN"
            >
              <GoogleMap
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                defaultCenter={defaultCenter}
                defaultZoom={11}
                gestureHandling="greedy"
                style={{ width: '100%', height: '100%' }}
              >
                {locatedCustomers.map((cust) => (
                  <CustomerMapPinMarker
                    key={cust.id}
                    customer={cust}
                    isSelected={selectedId === cust.id}
                    onSelect={() => setSelectedId(cust.id)}
                    onCloseWindow={() => setSelectedId(null)}
                  />
                ))}
              </GoogleMap>
            </APIProvider>
          )}
        </div>
      </div>
    </div>
  );
};
