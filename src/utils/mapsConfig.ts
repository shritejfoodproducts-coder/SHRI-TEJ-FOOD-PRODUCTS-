import { useEffect, useState } from 'react';

export interface GoogleMapsClientConfig {
  loaded: boolean;
  ok: boolean;
  apiKey: string;
  hasGeminiGrounding: boolean;
}

let cachedConfig: GoogleMapsClientConfig | null = null;
let inflightPromise: Promise<GoogleMapsClientConfig> | null = null;

export async function fetchGoogleMapsConfig(): Promise<GoogleMapsClientConfig> {
  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (cachedConfig && cachedConfig.loaded && (cachedConfig.apiKey || !envKey)) {
    return cachedConfig;
  }

  if (!inflightPromise) {
    inflightPromise = (async () => {
      try {
        const res = await fetch('/api/maps/config');
        if (res.ok) {
          const data = (await res.json()) as {
            ok?: boolean;
            apiKey?: string;
            hasGeminiGrounding?: boolean;
          };
          const resolvedKey = (data.apiKey || envKey || '').trim();
          cachedConfig = {
            loaded: true,
            ok: Boolean(resolvedKey),
            apiKey: resolvedKey,
            hasGeminiGrounding: Boolean(data.hasGeminiGrounding),
          };
          return cachedConfig;
        }
      } catch {
        // Fallback cleanly to Vite env variable when offline/API unavailable
      }
      cachedConfig = {
        loaded: true,
        ok: Boolean(envKey),
        apiKey: envKey,
        hasGeminiGrounding: false,
      };
      return cachedConfig;
    })().finally(() => {
      inflightPromise = null;
    });
  }

  return inflightPromise;
}

export function useGoogleMapsConfig(): GoogleMapsClientConfig {
  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const [config, setConfig] = useState<GoogleMapsClientConfig>(() =>
    cachedConfig || {
      loaded: Boolean(envKey),
      ok: Boolean(envKey),
      apiKey: envKey,
      hasGeminiGrounding: false,
    }
  );

  useEffect(() => {
    let active = true;
    fetchGoogleMapsConfig().then((cfg) => {
      if (active) setConfig(cfg);
    });
    return () => {
      active = false;
    };
  }, []);

  return config;
}

export function triggerGmpQuotaBannerIfNeeded(statusOrCode?: string | number | null): boolean {
  const text = String(statusOrCode ?? '');
  if (
    statusOrCode === 429 ||
    text.includes('429') ||
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('OverQuotaMapError') ||
    text.includes('QuotaExceededError')
  ) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
    return true;
  }
  return false;
}

export function buildGoogleMapsPlaceUrl(lat: number, lng: number, placeId?: string): string {
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(placeId)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
