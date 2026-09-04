import React, { memo, useCallback } from 'react';
import DOMPurify from 'dompurify';

const ResultCard = memo(({ item, isActive, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  const timeAgo = (date) => { const s = Math.floor((new Date() - date) / 1000); if(s < 60) return "ahora"; if(s < 3600) return Math.floor(s/60) + "m"; if(s < 86400) return Math.floor(s/3600) + "h"; return Math.floor(s/86400) + "d"; };
  
  let validDate = false;
  let dateStr = 'Fecha desconocida';
  try {
    if (item && item.createdAt) {
      const date = new Date(item.createdAt);
      if (!isNaN(date.getTime())) {
        dateStr = String(timeAgo(date));
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
          ? 'bg-blue-50 border-blue-400 shadow-sm' 
          : 'bg-white border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800">{nameStr}</h4>
        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{dateStr}</span>
      </div>
      
      {item && item.type === 'chat' ? (
        <div className="text-sm text-gray-600">
          {prevContextStr !== '' ? (
             <p className="text-gray-400 italic mb-1 line-clamp-1 border-l-2 border-gray-300 pl-2">
               {prevContextStr}
             </p>
          ) : null}
          <p 
            className="line-clamp-3 whitespace-pre-wrap" 
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(snippetStr, { 
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark', 'br'], 
                ALLOWED_ATTR: [] 
              }) 
            }}
          />
        </div>
      ) : null}
      
      {item && item.type === 'client' ? (
        <p className="text-sm text-gray-600">Teléfono: {phoneStr}</p>
      ) : null}
    </div>
  );
});

ResultCard.displayName = 'ResultCard';
export default ResultCard;
