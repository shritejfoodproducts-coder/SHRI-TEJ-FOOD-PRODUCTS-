/**
 * Utility to calculate Local Device / Mobile Storage consumption and statistics.
 * Ensures 100% free offline operation with zero cloud costs.
 */

export interface LocalStorageStats {
  usedBytes: number;
  usedFormatted: string;
  totalRecordsCount: number;
  storageType: 'Local Device Storage (फ़ोन मेमोरी)';
  isCloudActive: false;
  lastSyncTime: string;
  quotaPercentEstimate: number;
}

export function getDeviceStorageStats(): LocalStorageStats {
  let totalBytes = 0;
  let recordsCount = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        totalBytes += (key.length + val.length) * 2; // UTF-16 approx bytes

        if (key.includes('tej_food_products_erp')) {
          try {
            const parsed = JSON.parse(val);
            if (parsed) {
              recordsCount += (parsed.orders?.length || 0);
              recordsCount += (parsed.customers?.length || 0);
              recordsCount += (parsed.production?.length || 0);
              recordsCount += (parsed.expenses?.length || 0);
              recordsCount += (parsed.staff?.length || 0);
              recordsCount += (parsed.bagStock?.length || 0);
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
  } catch (err) {
    console.error('Error calculating storage size:', err);
  }

  // Format bytes
  let formatted = '';
  if (totalBytes < 1024) {
    formatted = `${totalBytes} B`;
  } else if (totalBytes < 1024 * 1024) {
    formatted = `${(totalBytes / 1024).toFixed(1)} KB`;
  } else {
    formatted = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Modern browsers typically give 5MB - 10MB per origin for localStorage
  const estimatedQuotaBytes = 5 * 1024 * 1024;
  const quotaPercent = Math.min(100, Math.round((totalBytes / estimatedQuotaBytes) * 100));

  return {
    usedBytes: totalBytes,
    usedFormatted: formatted,
    totalRecordsCount: recordsCount,
    storageType: 'Local Device Storage (फ़ोन मेमोरी)',
    isCloudActive: false,
    lastSyncTime: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
    quotaPercentEstimate: quotaPercent,
  };
}
