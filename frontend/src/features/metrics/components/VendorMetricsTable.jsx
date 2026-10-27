import { BarChart3 } from 'lucide-react';
import { Badge, EmptyState, Eyebrow, Panel } from '../../../components/ui/index.js';

const VendorMetricsTable = ({ metrics }) => {
  const isEmpty = !metrics || metrics.length === 0;

  const formatResponseTime = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/D';
    if (seconds < 60) return `${Math.round(seconds)}s`;

    let mins = Math.floor(seconds / 60);
    let secs = Math.round(seconds % 60);

    if (secs === 60) {
      mins += 1;
      secs = 0;
    }

    if (mins < 60) {
      return `${mins}m ${secs}s`;
    }

    let hours = Math.floor(mins / 60);
    mins = mins % 60;

    if (hours < 24) {
      return `${hours}h ${mins}m`;
    }

    const days = Math.floor(hours / 24);
    hours = hours % 24;
    return `${days}d ${hours}h`;
  };

  const formatPercentage = (rate) => {
    return `${Math.round(rate * 100)}%`;
  };

  const headers = ['Asesor', 'Chats atendidos', 'Tasa de resolución', 'T. promedio en cola', 'T. de respuesta promedio', 'Rendimiento'];

  return (
    <Panel eyebrow="Productividad" title="Rendimiento por asesor" padded={false}>
      {isEmpty ? (
        <EmptyState
          compact
          icon={BarChart3}
          title="Sin métricas en este período"
          description="Ajusta el rango de fechas para ver la actividad de tus asesores."
        />
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} className="border-b border-border px-4 py-2.5 text-left whitespace-nowrap">
                    <Eyebrow tone="muted">{h}</Eyebrow>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const pct = Math.round((m.resolutionRate || 0) * 100);
                return (
                  <tr key={m.vendorId} className="border-b border-border/70 transition-colors last:border-0 hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{m.name}</div>
                      <div className="text-xs text-fg-muted">{m.email}</div>
                    </td>
                    <td className="tnum px-4 py-3 font-mono text-fg">{m.totalChatsHandled}</td>
                    <td className="px-4 py-3">
                      {m.totalChatsHandled === 0 ? (
                        <Badge tone="neutral">N/D</Badge>
                      ) : (
                        <Badge tone={m.resolutionRate >= 0.8 ? 'success' : 'warning'}>
                          {formatPercentage(m.resolutionRate)}
                        </Badge>
                      )}
                    </td>
                    <td className="tnum px-4 py-3 font-mono text-fg-muted">{formatResponseTime(m.averageQueueTime)}</td>
                    <td className="tnum px-4 py-3 font-mono text-fg-muted">{formatResponseTime(m.averageResponseTime)}</td>
                    <td className="w-48 px-4 py-3">
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Rendimiento de ${m.name}`}
                      >
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

export default VendorMetricsTable;
