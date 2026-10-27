import { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, Headset, ArrowRightLeft, UserX, AlertTriangle } from 'lucide-react';
import VendorMetricsTable from '../features/metrics/components/VendorMetricsTable';
import UsageReport from '../features/metrics/components/UsageReport';
import { getVendorProductivityMetrics, getAiMetrics } from '../features/metrics/metricsService';
import { Button, Eyebrow, Field, Input, PageHeader, Spinner } from '../components/ui/index.js';

const StatCard = ({ label, value, icon: Icon, tone = 'neutral' }) => {
  const toneText = { neutral: 'text-fg-muted', accent: 'text-accent', success: 'text-success', warning: 'text-warning', danger: 'text-danger', info: 'text-info' }[tone];
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <Eyebrow tone="muted">{label}</Eyebrow>
        <Icon size={14} className={toneText} aria-hidden />
      </div>
      <div className="tnum text-3xl font-semibold tracking-tight text-fg leading-none">{value}</div>
    </div>
  );
};

export default function Metrics() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [metrics, setMetrics] = useState([]);
  const [aiMetrics, setAiMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const isMounted = useRef(true);
  const initialFetchDone = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchMetrics = useCallback(async (start, end) => {
    if (!start || !end) {
      setError('Por favor, selecciona una fecha de inicio y una fecha de fin.');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        throw new Error('Formato de fecha inválido');
      }
      const [startYear, startMonth, startDay] = start.split('-');
      const startDateTimeObj = new Date();
      startDateTimeObj.setFullYear(parseInt(startYear, 10), parseInt(startMonth, 10) - 1, parseInt(startDay, 10));
      startDateTimeObj.setHours(0, 0, 0, 0);

      const [endYear, endMonth, endDay] = end.split('-');
      const endDateTimeObj = new Date();
      endDateTimeObj.setFullYear(parseInt(endYear, 10), parseInt(endMonth, 10) - 1, parseInt(endDay, 10));
      endDateTimeObj.setHours(23, 59, 59, 999);

      const startIso = startDateTimeObj.toISOString();
      const endIso = endDateTimeObj.toISOString();

      const data = await getVendorProductivityMetrics(
        startIso,
        endIso,
        { signal: abortController.signal },
      );

      const aiData = await getAiMetrics(
        startIso,
        endIso,
        { signal: abortController.signal },
      );

      if (isMounted.current && !abortController.signal.aborted) {
        setMetrics(data.data || []);
        setAiMetrics(aiData.data || null);
      }
    } catch (err) {
      if (isMounted.current && err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError(err.response?.data?.message || err.message || 'Error al obtener métricas');
      }
    } finally {
      if (isMounted.current && !abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Initialize with current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const start = formatDate(firstDay);
    const end = formatDate(lastDay);
    setStartDate(start);
    setEndDate(end);

    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchMetrics(start, end);
    }
  }, [/* empty deps to run only once */]);

  // useEffect for fetching on initial load is now combined with date initialization above.
  // We no longer have a useEffect depending on [startDate, endDate] to avoid double fetching on typing.

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Equipo"
        title="Métricas y productividad"
        description="Evalúa el rendimiento de tus asesores en el período seleccionado."
        actions={
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              fetchMetrics(startDate, endDate);
            }}
          >
            <Field label="Desde">
              {(a11y) => (
                <Input
                  {...a11y}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              )}
            </Field>
            <Field label="Hasta">
              {(a11y) => (
                <Input
                  {...a11y}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              )}
            </Field>
            <Button type="submit" variant="primary" loading={loading}>
              Aplicar
            </Button>
          </form>
        }
      />

      <div className="space-y-6">
        {error ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : loading ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface">
            <Spinner size={20} label="Cargando métricas" />
          </div>
        ) : (
          <>
            {aiMetrics && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Interacciones IA" value={aiMetrics.total || 0} icon={Bot} />
                <StatCard label="Atendiendo ahora" value={aiMetrics.waiting || 0} icon={Headset} tone="info" />
                <StatCard label="Transferidos a asesor" value={aiMetrics.escalated || 0} icon={ArrowRightLeft} tone="success" />
                <StatCard label="Abandonados por cliente" value={aiMetrics.abandoned || 0} icon={UserX} tone="warning" />
              </div>
            )}
            <VendorMetricsTable metrics={metrics} />
          </>
        )}

        <UsageReport />
      </div>
    </div>
  );
}
