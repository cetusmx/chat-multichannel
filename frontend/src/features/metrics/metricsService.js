import { get } from '../../services/api';

export const getVendorProductivityMetrics = async (startDate, endDate, config = {}) => {
  const query = new URLSearchParams({ startDate, endDate }).toString();
  const response = await get(`/metrics/productivity?${query}`, config);
  return response.json();
};
