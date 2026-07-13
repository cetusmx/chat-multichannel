import api from '../../services/api';

export const getVendorProductivityMetrics = async (startDate, endDate, config = {}) => {
  const response = await api.get('/metrics/productivity', {
    params: { startDate, endDate },
    ...config
  });
  return response.data;
};
