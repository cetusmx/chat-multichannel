import React, { useState, useEffect, useCallback, useRef } from 'react';
import VendorMetricsTable from '../features/metrics/components/VendorMetricsTable';
import { getVendorProductivityMetrics } from '../features/metrics/metricsService';
import './Metrics.css';

export default function Metrics() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [metrics, setMetrics] = useState([]);
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
        throw new Error("Formato de fecha inválido");
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
        { signal: abortController.signal }
      );
      
      if (isMounted.current && !abortController.signal.aborted) {
        setMetrics(data.data || []);
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

  // useEffect for fetching on initial load is now combined with date initialization above.
  // We no longer have a useEffect depending on [startDate, endDate] to avoid double fetching on typing.

  return (
    <div className="metrics-container">
      <div className="metrics-header">
        <div>
          <h1 className="metrics-title">Métricas y Productividad</h1>
          <p className="metrics-subtitle">Evalúa el rendimiento de tus asesores en tiempo real.</p>
        </div>
        
        {/* Date Range Picker */}
        <div className="date-picker-container">
          <div className="date-field">
            <label className="date-label">Desde</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
          </div>
          <div className="date-field">
            <label className="date-label">Hasta</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
            />
          </div>
          <button 
            onClick={() => fetchMetrics(startDate, endDate)}
            className="apply-button"
          >
            Aplicar
          </button>
        </div>
      </div>

      {error ? (
        <div className="error-message">
          {error}
        </div>
      ) : loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <VendorMetricsTable metrics={metrics} />
      )}
    </div>
  );
}
