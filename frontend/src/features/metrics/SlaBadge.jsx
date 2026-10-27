import { Badge } from '../../components/ui/index.js';

export default function SlaBadge({ isSlaBreached, breachType, className = '' }) {
  if (!isSlaBreached) return null;

  const isFirstResponse = breachType === 'firstResponse';
  const label = isFirstResponse ? 'SLA: 1ra resp.' : 'SLA: resolución';
  const title = isFirstResponse ? 'Primera respuesta fuera de SLA' : 'Tiempo de resolución fuera de SLA';

  return (
    <Badge tone={isFirstResponse ? 'warning' : 'danger'} dot title={title} className={className}>
      {label}
    </Badge>
  );
}
