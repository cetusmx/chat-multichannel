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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to download report');
  }
  return response.blob();
};
