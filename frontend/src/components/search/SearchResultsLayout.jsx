import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ResultCard from './ResultCard';
import ChatViewerDetail from '../chat/ChatViewerDetail';

export default function SearchResultsLayout({ data, loading, error, query, meta, onPageChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedChatId = searchParams.get('selectedChatId');
  const targetMessageId = searchParams.get('targetMessageId');

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800">Error al buscar</h3>
        <p className="text-gray-500 mt-2">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
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
      <div className="space-y-4">
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

  const { pagination } = meta || {};
  const loaderRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if(entries[0].isIntersecting && pagination?.hasMore && !loading) onPageChange(pagination.page + 1);
    }, { threshold: 1.0 });
    if(loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loading, pagination, onPageChange]);

  const handleCardClick = React.useCallback((item) => {
    if (item.type === 'chat') {
      const newParams = new URLSearchParams(searchParams);
      if (selectedChatId === item.conversationId && targetMessageId === item.id) {
        // Deselect if already active
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

  // Master column hide logic on mobile
  const masterClass = selectedChatId ? "hidden lg:flex" : "flex";
  // Detail column hide logic on mobile
  const detailClass = selectedChatId ? "flex" : "hidden lg:flex";

  return (
    <div className="flex flex-col h-full lg:flex-row gap-6">
      {/* Master Column */}
      <div className={`${masterClass} flex-1 lg:w-1/3 xl:w-1/4 flex-col space-y-4 overflow-y-auto pr-2 pb-10`}>
        {data?.map(item => (
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
          <span className="text-sm text-gray-500">Página {pagination?.page || 1}</span>
          <button 
            disabled={!pagination?.hasMore || loading}
            onClick={() => onPageChange(pagination.page + 1)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Detail Column (US-2.2) */}
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
