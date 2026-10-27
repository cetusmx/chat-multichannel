import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { downloadUsageReport } from '../metricsService';
import { Button, Field, Panel, Select } from '../../../components/ui/index.js';
import { toast } from '../../../stores/useToastStore.js';

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
  { value: 12, label: 'Diciembre' },
];

const UsageReport = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const years = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, [currentYear]);

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
      toast.success('Reporte descargado');
    } catch (err) {
      const message = err.message || 'Error al descargar el reporte';
      setError(message);
      toast.error('No se pudo descargar el reporte', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Panel
      eyebrow="Exportar"
      title="Reporte de uso y actividad"
      description="Descarga un reporte mensual en formato CSV con el volumen de mensajes, interacciones con IA y sesiones activas."
    >
      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <Field label="Año">
          {(a11y) => (
            <Select
              {...a11y}
              value={year}
              onChange={(e) => {
                const selectedYear = Number(e.target.value);
                setYear(selectedYear);
                if (selectedYear === currentYear && month > currentMonth) {
                  setMonth(currentMonth);
                }
              }}
              disabled={isLoading}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Mes">
          {(a11y) => (
            <Select
              {...a11y}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={isLoading}
            >
              {months.map(m => (
                <option
                  key={m.value}
                  value={m.value}
                  disabled={year === currentYear && m.value > currentMonth}
                >
                  {m.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Button
          variant="secondary"
          icon={Download}
          loading={isLoading}
          onClick={handleDownload}
          className="w-full"
        >
          {isLoading ? 'Descargando' : 'Descargar CSV'}
        </Button>
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
    </Panel>
  );
};

export default UsageReport;
