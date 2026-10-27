import { useEffect, useState } from 'react';
import { FileText, Download, ImageOff } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import { cn } from '../utils/cn.js';

/**
 * SecureMedia - Fetches and renders media using Bearer token without exposing it in URLs
 */
export default function SecureMedia({ url, className, type = 'IMAGE', alt, fallbackText }) {
  const token = useAuthStore(state => state.token);
  const [src, setSrc] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;

    let fetchUrl = url;
    if (url.startsWith('/api')) {
      fetchUrl = `${import.meta.env.VITE_API_URL}${url}`;
    }

    fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(r => {
      if (!r.ok) {
        if (r.status === 401) {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
        }
        throw new Error('Network error');
      }
      return r.blob();
    })
    .then(blob => {
      objectUrl = URL.createObjectURL(blob);
      if (isMounted) {
        setSrc(objectUrl);
      } else {
        URL.revokeObjectURL(objectUrl);
      }
    })
    .catch(err => {
      console.error(err);
      if (isMounted) setHasError(true);
    });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, token]);

  if (hasError) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
        <ImageOff size={14} aria-hidden />
        <span>No se pudo cargar el archivo</span>
      </div>
    );
  }

  if (!src) {
    return <div className="h-20 w-32 animate-pulse rounded-md bg-surface-2" aria-busy="true" aria-label="Cargando archivo" />;
  }

  if (type === 'IMAGE') {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="group relative block cursor-zoom-in">
        <img src={src} alt={alt} className={cn(className, 'max-h-64 rounded-md object-contain')} onError={(e) => { e.target.onerror = null; e.target.src = '/assets/fallback-image.png'; }} />
        {fallbackText && (
          <div className="absolute inset-x-0 bottom-0 truncate rounded-b-md bg-surface-inverse/80 px-2 py-1 font-mono text-[10px] text-fg-inverse opacity-0 transition-opacity group-hover:opacity-100">
            {fallbackText}
          </div>
        )}
      </a>
    );
  }
  if (type === 'VIDEO') {
    return <video src={src} controls className={cn(className, 'max-h-64 rounded-md')} />;
  }
  if (type === 'AUDIO') {
    return <audio src={src} controls className="w-full" />;
  }

  const fileName = fallbackText || 'Archivo adjunto';
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      title={fileName}
      className={cn(
        'inline-flex max-w-full items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg transition-colors hover:bg-surface-2 hover:border-border-strong',
        className,
      )}
    >
      <FileText size={16} className="shrink-0 text-fg-muted" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{fileName}</span>
      <Download size={14} className="shrink-0 text-fg-subtle" aria-hidden />
    </a>
  );
}
