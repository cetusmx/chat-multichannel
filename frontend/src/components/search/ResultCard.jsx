import React, { memo, useCallback } from 'react';
import DOMPurify from 'dompurify';

const ResultCard = memo(({ item, isActive, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  const timeAgo = (date) => { const s = Math.floor((new Date() - date) / 1000); if(s < 60) return "ahora"; if(s < 3600) return Math.floor(s/60) + "m"; if(s < 86400) return Math.floor(s/3600) + "h"; return Math.floor(s/86400) + "d"; };
  const date = new Date(item.createdAt);
  const isValidDate = !isNaN(date.getTime());

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
        <h4 className="font-semibold text-gray-800">
          {typeof (item.clientName || item.name || item.phone) === 'object' ? JSON.stringify(item.clientName || item.name || item.phone) : (item.clientName || item.name || item.phone || 'Contacto Desconocido')}
        </h4>
        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
          {isValidDate ? (typeof timeAgo(date) === 'object' ? JSON.stringify(timeAgo(date)) : timeAgo(date)) : 'Fecha desconocida'}
        </span>
      </div>
      
      {item.type === 'chat' && (
        <div className="text-sm text-gray-600">
          {item.previousMessageContext && (
             <p className="text-gray-400 italic mb-1 line-clamp-1 border-l-2 border-gray-300 pl-2">
               {typeof item.previousMessageContext === 'object' ? JSON.stringify(item.previousMessageContext) : item.previousMessageContext}
             </p>
          )}
          <p 
            className="line-clamp-3 whitespace-pre-wrap" 
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(typeof (item.snippet || item.body || item.content) === 'object' ? JSON.stringify(item.snippet || item.body || item.content) : (item.snippet || item.body || item.content || 'Coincidencia en metadatos'), { 
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark', 'br'], 
                ALLOWED_ATTR: [] 
              }) 
            }}
          />
        </div>
      )}
      
      {item.type === 'client' && (
        <p className="text-sm text-gray-600">Teléfono: {typeof item.phone === 'object' ? JSON.stringify(item.phone) : item.phone}</p>
      )}
    </div>
  );
});

ResultCard.displayName = 'ResultCard';
export default ResultCard;
