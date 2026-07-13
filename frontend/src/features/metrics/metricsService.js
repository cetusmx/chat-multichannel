import { get } from '../../services/api';

export const getVendorProductivityMetrics = async (startDate, endDate, config = {}) => {
  const query = new URLSearchParams({ startDate, endDate }).toString();
  const response = await get(`/metrics/productivity?${query}`, config);
  return response.json();
};
export const downloadUsageReport = async (year, month, config = {}) => {
  const query = new URLSearchParams({ year, month }).toString();
  const response = await get(`/metrics/reports/usage?${query}`, config);
  if (!response.ok) {
    let errorMessage = 'Failed to download report';
    const textError = await response.text().catch(() => null);
    if (textError) {
      try {
        const errorData = JSON.parse(textError);
        if (errorData !== null && typeof errorData === 'object') {
          const apiError = errorData.error || errorData.message;
          if (apiError) {
            errorMessage = typeof apiError === 'string' ? apiError : JSON.stringify(apiError);
          }
        }
      } catch (e) {
        const normalized = textError.trim().toLowerCase();
        if (normalized.startsWith('<html') || normalized.startsWith('<!doctype html')) {
          errorMessage = `Proxy/Server Error (${response.status})`;
        } else {
          errorMessage = textError.substring(0, 100);
        }
      }
    } else {
      errorMessage = `Server Error (${response.status})`;
    }
    throw new Error(errorMessage);
  }
  return response.blob();
};
