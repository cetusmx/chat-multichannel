import { cn } from '../../utils/cn.js';

const tones = {
  muted: 'text-fg-subtle',
  default: 'text-fg-muted',
  accent: 'text-accent',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

/**
 * Mono uppercase micro label: section headers, metadata lines, kickers.
 */
export default function Eyebrow({ as: Tag = 'span', tone = 'default', className, children, ...props }) {
  return (
    <Tag className={cn('eyebrow', tones[tone] || tones.default, className)} {...props}>
      {children}
    </Tag>
  );
}
