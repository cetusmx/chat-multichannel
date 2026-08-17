import React, { useEffect, useState } from 'react';
import useAuthStore from '../stores/useAuthStore';

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

  if (hasError) return <div className="bg-sales-slate-800 border border-red-500/30 text-red-400 p-2 text-xs rounded flex flex-col items-center"><span>⚠️ Error</span><span>al cargar</span></div>;
  if (!src) return <div className="animate-pulse bg-sales-slate-700 h-20 w-32 rounded-md flex items-center justify-center text-xs text-sales-slate-400">Cargando...</div>;

  if (type === 'IMAGE') {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="block cursor-zoom-in group relative">
        <img src={src} alt={alt} className={`${className} max-h-64 object-contain rounded-md`} onError={(e) => { e.target.onerror = null; e.target.src = '/assets/fallback-image.png'; }} />
        {fallbackText && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity">
            {fallbackText}
          </div>
        )}
      </a>
    );
  }
  if (type === 'VIDEO') {
    return <video src={src} controls className={`${className} max-h-64`} />;
  }
  if (type === 'AUDIO') {
    return <audio src={src} controls className="w-full" />;
  }
  if (type === 'DOCUMENT') {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 px-3 py-2 bg-black/20 hover:bg-black/40 rounded-lg transition-colors ${className}`}
      >
        <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        <span className="truncate">{fallbackText || 'Archivo adjunto'}</span>
      </a>
    );
  }
  return <a href={src} target="_blank" rel="noopener noreferrer" className="underline font-semibold flex items-center gap-1">📎 Archivo adjunto</a>;
}
