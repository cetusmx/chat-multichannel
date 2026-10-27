import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export default function Spinner({ size = 16, className, label = 'Cargando' }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center justify-center text-fg-muted', className)}>
      <Loader2 size={size} className="animate-spin" aria-hidden />
    </span>
  );
}
