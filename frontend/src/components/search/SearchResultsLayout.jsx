import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ResultCard from './ResultCard';
import ChatViewerDetail from '../chat/ChatViewerDetail';

export default function SearchResultsLayout({ data, loading, error, meta, onPageChange }) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-bold text-gray-800">Error al buscar</h3>
        <p className="text-gray-500 mt-2">{typeof error === "object" ? JSON.stringify(error) : error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (loading && (!data || data.length === 0)) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse flex space-x-4 p-4 border border-gray-200 rounded-lg bg-white">
            <div className="rounded-full bg-gray-200 h-10 w-10"></div>
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && data && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-bold text-gray-800">No se encontraron resultados</h3>
        <p className="text-gray-500 mt-2">Intenta con otros términos o ajusta tus filtros.</p>
      </div>
    );
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedChatId = searchParams.get('selectedChatId');
  const targetMessageId = searchParams.get('targetMessageId');

  const { pagination } = meta || {};
  const loaderRef = React.useRef(null);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if(entries[0].isIntersecting && pagination?.hasMore && !loading) {
        if(typeof onPageChange === 'function') onPageChange(pagination.page + 1);
      }
    }, { threshold: 1.0 });
    if(loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loading, pagination, onPageChange]);

  const handleCardClick = React.useCallback((item) => {
    if (item.type === 'chat') {
      const newParams = new URLSearchParams(searchParams);
      if (selectedChatId === item.conversationId && targetMessageId === item.id) {
        newParams.delete('selectedChatId');
        newParams.delete('targetMessageId');
      } else {
        newParams.set('selectedChatId', item.conversationId);
        newParams.set('targetMessageId', item.id);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, selectedChatId, targetMessageId, setSearchParams]);

  const handleBack = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('selectedChatId');
    newParams.delete('targetMessageId');
    setSearchParams(newParams, { replace: true });
  };

  const masterClass = selectedChatId ? "hidden lg:flex" : "flex";
  const detailClass = selectedChatId ? "flex" : "hidden lg:flex";

  return (
    <div className="flex flex-col h-full lg:flex-row gap-6">
      <div className={`${masterClass} flex-1 lg:w-1/3 xl:w-1/4 flex-col space-y-4 overflow-y-auto pr-2 pb-10`}>
        {data.map((item, i) => (
          <ResultCard 
            key={`${item.type}-${item.id}`} 
            item={item} 
            isActive={selectedChatId === item.conversationId && targetMessageId === item.id}
            onClick={handleCardClick}
          />
        ))}

        <div ref={loaderRef} className="h-10" />

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <button 
            disabled={pagination?.page <= 1 || loading}
            onClick={() => onPageChange(pagination.page - 1)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">Página {typeof pagination?.page === 'object' ? JSON.stringify(pagination?.page) : (pagination?.page || 1)}</span>
          <button 
            disabled={!pagination?.hasMore || loading}
            onClick={() => onPageChange(pagination.page + 1)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
      <div className={`${detailClass} flex-[2]`}>
         <ChatViewerDetail 
            conversationId={selectedChatId} 
            targetMessageId={targetMessageId} 
            onBack={handleBack} 
         />
      </div>
    </div>
  );
}
