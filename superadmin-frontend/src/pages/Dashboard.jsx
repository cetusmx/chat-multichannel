import { useState, useEffect } from 'react';
import axios from 'axios';
import api from '@/lib/axios';
import MetricWidget from '@/components/MetricWidget';
import { Alert } from '@/components/ui/Alert';
import { Building2, Users, Cpu } from 'lucide-react';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({ tenants: null, users: null, aiTokens: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get('/api/superadmin/metrics', { signal: controller.signal });
        const { tenants = 0, users = 0, aiTokens = 0 } = response?.data?.data || {};
        setMetrics({ tenants, users, aiTokens });
      } catch (error) {
        if (axios.isCancel(error)) return;
        
        // Ignore 401/403 as they are handled by global interceptor
        if (error.response?.status === 401 || error.response?.status === 403) {
          return;
        }
        
        setError(error?.response?.data?.message || 'Error de red');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [retryTrigger]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Resumen</h1>
      
      {error ? (
        <Alert onRetry={() => setRetryTrigger(prev => prev + 1)}>
          {error}
        </Alert>
      ) : (
        <ul data-testid={isLoading ? "dashboard-loading" : "dashboard-success"} className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0 m-0">
          <MetricWidget 
            title="Tenants" 
            value={metrics.tenants} 
            isLoading={isLoading} 
            icon={Building2} 
          />
          <MetricWidget 
            title="Users" 
            value={metrics.users} 
            isLoading={isLoading} 
            icon={Users} 
          />
          <MetricWidget 
            title="AI Tokens" 
            value={metrics.aiTokens} 
            isLoading={isLoading} 
            icon={Cpu} 
          />
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
