import { Fragment } from 'react';

/**
 * Renders WhatsApp inline formatting (*bold*, _italic_, ~strike~, ```mono```)
 * as React nodes. Works on plain text only; never injects HTML.
 */
const TOKEN_RE = /(```[\s\S]+?```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

export function renderWhatsAppText(text) {
  if (!text) return null;
  const parts = String(text).split(TOKEN_RE);

  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('```') && part.endsWith('```') && part.length > 6) {
      return (
        <code key={i} className="font-mono text-[0.9em] bg-black/20 px-1 rounded-sm">
          {part.slice(3, -3)}
        </code>
      );
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i} className="font-semibold">{part.slice(1, -1)}</strong>;
    }
    if (part.length > 2 && part.startsWith('_') && part.endsWith('_')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.length > 2 && part.startsWith('~') && part.endsWith('~')) {
      return <s key={i}>{part.slice(1, -1)}</s>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
