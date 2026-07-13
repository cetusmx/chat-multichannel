import React, { useState } from 'react';
import { downloadUsageReport } from '../metricsService';

const UsageReport = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const blob = await downloadUsageReport(year, month);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage-report-${year}-${month.toString().padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Error downloading report');
    } finally {
      setIsLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Reporte de Uso y Actividad</h3>
      <p className="text-sm text-slate-500 mb-6">
        Descarga un reporte mensual en formato CSV con el volumen de mensajes, interacciones con IA y sesiones activas.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-1/3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
          <select 
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full sm:w-1/3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Mes</label>
          <select 
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-coral-500 focus:outline-none focus:ring-1 focus:ring-coral-500"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-1/3">
          <button
            onClick={handleDownload}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Descargar CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageReport;
