import Badge from './Badge.jsx';
import { getStatusMeta } from '../../utils/conversationStatus.js';

/**
 * Conversation status rendered from the shared status map.
 * `variant="short"` uses the compact label for dense lists.
 */
export default function StatusPill({ status, variant = 'short', className }) {
  const meta = getStatusMeta(status);
  const tone = status === 'ESCALATED' ? 'solid-danger' : meta.tone;
  return (
    <Badge tone={tone} title={meta.description} aria-label={meta.label} className={className}>
      {variant === 'short' ? meta.short : meta.label}
    </Badge>
  );
}
