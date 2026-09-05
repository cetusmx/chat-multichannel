import React, { memo, useCallback } from 'react';
import DOMPurify from 'dompurify';

const ResultCard = memo(({ item, isActive, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  let validDate = false;
  let dateStr = 'Fecha desconocida';
  try {
    if (item && item.createdAt) {
      const date = new Date(item.createdAt);
      if (!isNaN(date.getTime())) {
        dateStr = new Intl.DateTimeFormat('es-MX', { 
          day: '2-digit', month: 'short', year: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        }).format(date);
      }
    }
  } catch(e) {}

  let nameStr = 'Contacto Desconocido';
  try {
    if (item) {
      const n = item.clientName || item.name || item.phone;
      if (n) nameStr = typeof n === 'object' ? JSON.stringify(n) : String(n);
    }
  } catch(e) {}

  let vendorNameStr = '';
  try {
    if (item?.vendorName) {
      vendorNameStr = typeof item.vendorName === 'object' ? JSON.stringify(item.vendorName) : String(item.vendorName);
    }
  } catch(e) {}

  let prevContextStr = '';
  try {
    if (item && item.previousMessageContext) {
      prevContextStr = typeof item.previousMessageContext === 'object' ? JSON.stringify(item.previousMessageContext) : String(item.previousMessageContext);
    }
  } catch(e) {}

  let snippetStr = 'Coincidencia en metadatos';
  try {
    if (item) {
      const s = item.snippet || item.body || item.content;
      if (s) snippetStr = typeof s === 'object' ? JSON.stringify(s) : String(s);
    }
  } catch(e) {}

  let phoneStr = '';
  try {
    if (item && item.phone) {
      phoneStr = typeof item.phone === 'object' ? JSON.stringify(item.phone) : String(item.phone);
    }
  } catch(e) {}

  return (
    <div 
      onClick={handleClick}
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isActive 
          ? 'bg-sales-slate-800 border-blue-500 shadow-md' 
          : 'bg-sales-slate-900/60 border-sales-slate-800 hover:bg-sales-slate-800/80 shadow-sm backdrop-blur-md'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-sales-slate-100">{nameStr}</h4>
          {vendorNameStr && <p className="text-[11px] text-sales-slate-400 mt-0.5">Asesor: {vendorNameStr}</p>}
        </div>
        <span className="text-[11px] text-sales-slate-400 whitespace-nowrap ml-2 text-right">{dateStr}</span>
      </div>
      
      {item && item.type === 'chat' ? (
        <div className="text-sm text-sales-slate-300">
          {prevContextStr !== '' ? (
             <p className="text-sales-slate-500 italic mb-1 line-clamp-1 border-l-2 border-sales-slate-700 pl-2">
               {prevContextStr}
             </p>
          ) : null}
          <p 
            className="line-clamp-3 whitespace-pre-wrap bg-sales-slate-950/50 p-2 rounded border border-sales-slate-800/50" 
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(snippetStr, { 
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark', 'br'], 
                ALLOWED_ATTR: ['class'] 
              }).replace(/<b>/g, '<mark class="bg-sales-orange/30 text-sales-orange-light px-1 rounded font-bold">').replace(/<\/b>/g, '</mark>')
            }}
          />
        </div>
      ) : null}
      
      {item && item.type === 'client' ? (
        <p className="text-sm text-sales-slate-400">Teléfono: {phoneStr}</p>
      ) : null}
    </div>
  );
});

ResultCard.displayName = 'ResultCard';
export default ResultCard;
