/**
 * Brand mark: two interlocking arrows. Uses the current accent token so it
 * follows the theme automatically.
 */
export function Logo({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M 50 5 L 16.5 50 L 49 60 L 41.5 40 Z" fill="currentColor" className="text-fg" />
      <path d="M 50 95 L 83.5 50 L 51 40 L 58.5 60 Z" fill="var(--accent)" />
    </svg>
  );
}
