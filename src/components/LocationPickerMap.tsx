import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import {
  Crosshair,
  MapPin,
  Search,
  Sparkles,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  buildGoogleMapsPlaceUrl,
  triggerGmpQuotaBannerIfNeeded,
  useGoogleMapsConfig,
} from '../utils/mapsConfig';

export interface CapturedMapLocation {
  latitude: number;
  longitude: number;
  placeId?: string;
  mapAddress?: string;
  address?: string;
  city?: string;
  googleMapsUrl: string;
}

interface LocationPickerMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  firmName?: string;
  onLocationChange: (loc: CapturedMapLocation) => void;
}

interface GroundingChunkResult {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets?: Array<{ googleMapsUri?: string; reviewId?: string }>;
}

interface PlaceAddressComponent {
  types?: string[];
  longText?: string | null;
  shortText?: string | null;
}

interface PlaceDetailsResult {
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: { lat: () => number; lng: () => number } | null;
  id?: string | null;
  addressComponents?: PlaceAddressComponent[];
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
}

interface AutocompleteSuggestionItem {
  placePrediction?: {
    placeId?: string;
    text: { text: string };
    toPlace: () => PlaceDetailsResult;
  };
}

interface PlacesLibraryCompat {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (req: {
      input: string;
      sessionToken?: unknown;
      includedRegionCodes?: string[];
    }) => Promise<{ suggestions?: AutocompleteSuggestionItem[] }>;
  };
}

const DEFAULT_CENTER = { lat: 26.9124, lng: 75.7873 }; // Jaipur default

const LocationPickerMapInner: React.FC<
  LocationPickerMapProps & { hasGeminiGrounding: boolean }
> = ({
  latitude,
  longitude,
  address,
  city,
  firmName,
  hasGeminiGrounding,
  onLocationChange,
}) => {
  const apiStatus = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places') as unknown as PlacesLibraryCompat | null;

  const hasSavedPin =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(
    hasSavedPin ? { lat: latitude as number, lng: longitude as number } : null
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    hasSavedPin ? { lat: latitude as number, lng: longitude as number } : DEFAULT_CENTER
  );

  // Places API (New) Autocomplete state with SessionToken
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionItem[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const sessionTokenRef = useRef<unknown>(null);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Maps Grounding state
  const [isGrounding, setIsGrounding] = useState(false);
  const [groundingSummary, setGroundingSummary] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunkResult[]>([]);

  useEffect(() => {
    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      const next = { lat: latitude, lng: longitude };
      setMarkerPos(next);
      setMapCenter(next);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (apiStatus === APILoadingStatus.FAILED || apiStatus === APILoadingStatus.AUTH_FAILURE) {
      triggerGmpQuotaBannerIfNeeded('OverQuotaMapError');
      setErrorMsg('Google Maps लोड नहीं हो सका। आप नीचे GPS बटन या पते से लोकेशन सेव कर सकते हैं।');
    }
  }, [apiStatus]);

  // Debounced Places Autocomplete (New) with AutocompleteSessionToken
  useEffect(() => {
    if (!placesLib) return;
    const trimmed = searchInput.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsSearchingPlaces(true);
        setErrorMsg(null);
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['in'],
        });
        setSuggestions(res.suggestions || []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        triggerGmpQuotaBannerIfNeeded(msg);
        setSuggestions([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [placesLib, searchInput]);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  const reverseGeocodeCoords = useCallback(
    async (lat: number, lng: number) => {
      setIsGeocoding(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/maps/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          errorCode?: string;
          message?: string;
          formattedAddress?: string;
          city?: string;
          placeId?: string;
          googleMapsUrl?: string;
        };

        if (res.status === 429 || triggerGmpQuotaBannerIfNeeded(data.errorCode || data.message)) {
          setErrorMsg('Google Maps दैनिक कोटा समाप्त हो गया है, लेकिन आपके GPS निर्देशांक सुरक्षित हो गए हैं।');
          onLocationChange({
            latitude: lat,
            longitude: lng,
            googleMapsUrl: buildGoogleMapsPlaceUrl(lat, lng),
          });
          return;
        }

        if (data.ok && data.formattedAddress) {
          setStatusMessage(`मैप पता प्राप्त: ${data.formattedAddress}`);
          onLocationChange({
            latitude: lat,
            longitude: lng,
            placeId: data.placeId || undefined,
            mapAddress: data.formattedAddress,
            address: data.formattedAddress,
            city: data.city || undefined,
            googleMapsUrl:
              data.googleMapsUrl || buildGoogleMapsPlaceUrl(lat, lng, data.placeId || undefined),
          });
        } else {
          setStatusMessage('पिन निर्देशांक सेव हो गए हैं।');
          onLocationChange({
            latitude: lat,
            longitude: lng,
            googleMapsUrl: buildGoogleMapsPlaceUrl(lat, lng),
          });
        }
      } catch {
        onLocationChange({
          latitude: lat,
          longitude: lng,
          googleMapsUrl: buildGoogleMapsPlaceUrl(lat, lng),
        });
      } finally {
        setIsGeocoding(false);
      }
    },
    [onLocationChange]
  );

  const handleSelectSuggestion = async (suggestion: AutocompleteSuggestionItem) => {
    if (!suggestion.placePrediction) return;
    try {
      setIsGeocoding(true);
      setErrorMsg(null);
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'id', 'addressComponents'],
      });
      resetSession();

      const loc = place.location;
      if (!loc) {
        setErrorMsg('इस स्थान के निर्देशांक उपलब्ध नहीं हैं।');
        return;
      }

      const lat = loc.lat();
      const lng = loc.lng();
      const formattedAddress = place.formattedAddress || place.displayName || '';
      const comps = place.addressComponents || [];
      const cityComp =
        comps.find((c) => c.types?.includes('locality')) ||
        comps.find((c) => c.types?.includes('administrative_area_level_2')) ||
        comps.find((c) => c.types?.includes('administrative_area_level_3'));

      setMarkerPos({ lat, lng });
      setMapCenter({ lat, lng });
      setSearchInput('');
      setStatusMessage(`स्थान चुना गया: ${formattedAddress}`);

      onLocationChange({
        latitude: lat,
        longitude: lng,
        placeId: place.id || undefined,
        mapAddress: formattedAddress,
        address: formattedAddress,
        city: cityComp?.longText || cityComp?.shortText || undefined,
        googleMapsUrl: buildGoogleMapsPlaceUrl(lat, lng, place.id || undefined),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (triggerGmpQuotaBannerIfNeeded(msg)) {
        setErrorMsg('Google Maps कोटा सीमा पार हो गई है।');
      } else {
        setErrorMsg('चुने गए स्थान की जानकारी लोड नहीं हो सकी।');
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCaptureCurrentGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMsg('आपके ब्राउज़र/फ़ोन में GPS उपलब्ध नहीं है।');
      return;
    }

    setIsGettingGps(true);
    setErrorMsg(null);
    setStatusMessage('GPS से वर्तमान लोकेशन ली जा रही है...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1_000_000) / 1_000_000;
        const lng = Math.round(pos.coords.longitude * 1_000_000) / 1_000_000;
        setMarkerPos({ lat, lng });
        setMapCenter({ lat, lng });
        setIsGettingGps(false);
        void reverseGeocodeCoords(lat, lng);
      },
      (err) => {
        setIsGettingGps(false);
        setStatusMessage(null);
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? 'लोकेशन अनुमति अस्वीकार की गई। कृपया ब्राउज़र सेटिंग से Location Allow करें या मैप पर क्लिक करें।'
            : 'GPS सिग्नल नहीं मिला। कृपया मैप पर खोजकर पिन लगाएं।'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  const handleGeocodeTypedAddress = async () => {
    const combined = [address, city].filter((v) => Boolean(v && v.trim())).join(', ');
    if (!combined) {
      setErrorMsg('कृपया पहले दुकान का पता और शहर लिखें।');
      return;
    }

    setIsGeocoding(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/maps/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: combined }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        errorCode?: string;
        message?: string;
        lat?: number;
        lng?: number;
        formattedAddress?: string;
        city?: string;
        placeId?: string;
        googleMapsUrl?: string;
      };

      if (res.status === 429 || triggerGmpQuotaBannerIfNeeded(data.errorCode || data.message)) {
        setErrorMsg('Google Maps Geocoding कोटा समाप्त। कृपया मैप पर सीधे क्लिक करके पिन लगाएं।');
        return;
      }

      if (data.ok && typeof data.lat === 'number' && typeof data.lng === 'number') {
        const lat = data.lat;
        const lng = data.lng;
        setMarkerPos({ lat, lng });
        setMapCenter({ lat, lng });
        setStatusMessage(`पता मैप पर मिला: ${data.formattedAddress || combined}`);
        onLocationChange({
          latitude: lat,
          longitude: lng,
          placeId: data.placeId || undefined,
          mapAddress: data.formattedAddress || combined,
          city: data.city || undefined,
          googleMapsUrl:
            data.googleMapsUrl || buildGoogleMapsPlaceUrl(lat, lng, data.placeId || undefined),
        });
      } else {
        setErrorMsg(data.message || 'यह पता मैप पर नहीं मिला, कृपया ऊपर सर्च बॉक्स से चुनें।');
      }
    } catch {
      setErrorMsg('पता खोजने में नेटवर्क त्रुटि हुई।');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleFetchMapsGrounding = async () => {
    setIsGrounding(true);
    setErrorMsg(null);
    try {
      const pos = markerPos || mapCenter;
      const res = await fetch('/api/maps/grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: pos.lat,
          lng: pos.lng,
          firmName,
          query: firmName
            ? `What wholesale grain markets, main roads, or delivery landmarks are near "${firmName}" (${address || ''} ${city || ''})? Give short Hindi/English delivery guidance.`
            : undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        errorCode?: string;
        message?: string;
        summary?: string;
        groundingChunks?: GroundingChunkResult[];
      };

      if (res.status === 429 || triggerGmpQuotaBannerIfNeeded(data.errorCode || data.message)) {
        setErrorMsg('Maps Grounding कोटा सीमा पूरी हो गई है।');
        return;
      }

      if (!data.ok) {
        setErrorMsg(data.message || 'आस-पास मार्केट जानकारी नहीं मिल सकी।');
        return;
      }

      setGroundingSummary(data.summary || null);
      setGroundingChunks(Array.isArray(data.groundingChunks) ? data.groundingChunks : []);
    } catch {
      setErrorMsg('Maps Grounding अनुरोध विफल हुआ।');
    } finally {
      setIsGrounding(false);
    }
  };

  const handleMapCoordinatePick = (latLng: { lat: number; lng: number } | null | undefined) => {
    if (!latLng) return;
    const lat = Math.round(latLng.lat * 1_000_000) / 1_000_000;
    const lng = Math.round(latLng.lng * 1_000_000) / 1_000_000;
    setMarkerPos({ lat, lng });
    setMapCenter({ lat, lng });
    void reverseGeocodeCoords(lat, lng);
  };

  return (
    <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
      {/* Top Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
          <MapPin className="w-4 h-4 text-rose-600" />
          <span>Google Map लोकेशन व GPS पिन</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleCaptureCurrentGps}
            disabled={isGettingGps}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
          >
            {isGettingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5" />
            )}
            <span>GPS से वर्तमान लोकेशन लें</span>
          </button>

          <button
            type="button"
            onClick={handleGeocodeTypedAddress}
            disabled={isGeocoding}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Search className="w-3 h-3 text-amber-700" />
            <span>पते से खोजें</span>
          </button>

          {hasGeminiGrounding && (
            <button
              type="button"
              onClick={handleFetchMapsGrounding}
              disabled={isGrounding}
              className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              {isGrounding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 text-amber-700" />
              )}
              <span>आस-पास मंडी/मार्ग जांच</span>
            </button>
          )}
        </div>
      </div>

      {/* Places Autocomplete (New) Search Box */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Google Maps पर दुकान, बाजार या मोहल्ला खोजें (Autocomplete)..."
          className="w-full pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
        />
        {isSearchingPlaces && (
          <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin absolute right-3 top-2.5" />
        )}

        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-300 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((suggestion, idx) => (
              <li key={suggestion.placePrediction?.placeId || idx}>
                <button
                  type="button"
                  onClick={() => void handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50 text-xs text-slate-800 flex items-start gap-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{suggestion.placePrediction?.text.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Interactive @vis.gl/react-google-maps Map Canvas (Explicit height required per CF2) */}
      <div className="h-52 w-full rounded-xl overflow-hidden border border-slate-300 relative bg-slate-200">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultZoom={markerPos ? 15 : 11}
          center={mapCenter}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
          onClick={(e) => handleMapCoordinatePick(e.detail?.latLng)}
        >
          {markerPos && (
            <AdvancedMarker
              position={markerPos}
              draggable={true}
              title={firmName || 'चयनित ग्राहक लोकेशन'}
              onDragEnd={(e) => {
                const ll = e.latLng;
                if (ll) {
                  handleMapCoordinatePick({ lat: ll.lat(), lng: ll.lng() });
                }
              }}
            >
              <Pin
                background="#d97706"
                borderColor="#78350f"
                glyphColor="#ffffff"
              />
            </AdvancedMarker>
          )}
        </GoogleMap>
        <div className="absolute bottom-1.5 left-1.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-700 border border-slate-200 pointer-events-none">
          पिन लगाने के लिए मैप पर टैप करें या पिन को खिसकाएं
        </div>
      </div>

      {/* Feedback & Coordinate Badge */}
      {markerPos && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-900">
          <div className="flex items-center gap-1.5 font-mono font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              GPS: {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
            </span>
          </div>
          <a
            href={buildGoogleMapsPlaceUrl(markerPos.lat, markerPos.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
          >
            <span>Google Maps पर देखें</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {statusMessage && !errorMsg && (
        <p className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
          {statusMessage}
        </p>
      )}

      {errorMsg && (
        <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-lg px-2.5 py-1.5 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grounding Summary & Required Grounding Chunk Source Links */}
      {(groundingSummary || groundingChunks.length > 0) && (
        <div className="bg-white border border-amber-200 rounded-xl p-2.5 space-y-2 text-[11px]">
          <div className="font-bold text-amber-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>आस-पास मार्केट व डिलीवरी संदर्भ (Google Maps Grounding):</span>
          </div>
          {groundingSummary && (
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{groundingSummary}</p>
          )}
          {groundingChunks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
              {groundingChunks.map((chunk, idx) =>
                chunk.uri ? (
                  <a
                    key={chunk.placeId || idx}
                    href={chunk.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold"
                  >
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span>{chunk.title}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span
                    key={chunk.placeId || idx}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                  >
                    {chunk.title}
                  </span>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = (props) => {
  const mapsConfig = useGoogleMapsConfig();

  if (!mapsConfig.loaded) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
        <span>Google Maps लोड हो रहा है...</span>
      </div>
    );
  }

  if (!mapsConfig.apiKey) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-700" />
            <span>GPS लोकेशन कैप्चर (मैप कुंजी प्रतीक्षारत)</span>
          </span>
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  const lat = Math.round(pos.coords.latitude * 1_000_000) / 1_000_000;
                  const lng = Math.round(pos.coords.longitude * 1_000_000) / 1_000_000;
                  props.onLocationChange({
                    latitude: lat,
                    longitude: lng,
                    googleMapsUrl: buildGoogleMapsPlaceUrl(lat, lng),
                  });
                });
              }
            }}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>GPS लें</span>
          </button>
        </div>
        {typeof props.latitude === 'number' && typeof props.longitude === 'number' && (
          <p className="font-mono text-[11px] text-emerald-800 font-bold">
            ✓ GPS: {props.latitude.toFixed(5)}, {props.longitude.toFixed(5)}
          </p>
        )}
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={mapsConfig.apiKey}
      libraries={['places', 'marker']}
      language="hi"
      region="IN"
    >
      <LocationPickerMapInner
        {...props}
        hasGeminiGrounding={mapsConfig.hasGeminiGrounding}
      />
    </APIProvider>
  );
};
