import { useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import ResultCard from './ResultCard';
import ChatViewerDetail from '../chat/ChatViewerDetail';
import { Button, EmptyState } from '../ui/index.js';
import { cn } from '../../utils/cn.js';

function ResultSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="animate-pulse rounded-lg border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="h-4 w-1/2 rounded-md bg-surface-2" />
            <div className="h-3 w-20 rounded-md bg-surface-2" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded-md bg-surface-2" />
            <div className="h-3 w-5/6 rounded-md bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchResultsLayout({ data, loading, error, meta, onPageChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedChatId = searchParams.get('selectedChatId');
  const targetMessageId = searchParams.get('targetMessageId');

  const { pagination } = meta || {};
  const loaderRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && pagination?.hasMore && !loading) {
        if (typeof onPageChange === 'function') onPageChange(pagination.page + 1);
      }
    }, { threshold: 1.0 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loading, pagination, onPageChange]);

  const handleCardClick = useCallback((item) => {
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

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Error al buscar"
        description={typeof error === 'object' ? JSON.stringify(error) : error}
        action={<Button variant="outline" onClick={() => window.location.reload()}>Reintentar</Button>}
        className="h-full rounded-lg border border-border bg-surface"
      />
    );
  }

  if (loading && (!data || data.length === 0)) {
    return <ResultSkeleton />;
  }

  if (!loading && data && data.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No se encontraron resultados"
        description="Intenta con otros términos o ajusta tus filtros."
        className="h-full rounded-lg border border-border bg-surface"
      />
    );
  }

  const selectedChat = data.find(d => String(d.conversationId) === String(selectedChatId));
  const pageNumber = typeof pagination?.page === 'object' ? JSON.stringify(pagination?.page) : (pagination?.page || 1);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row">
      <div className={cn('min-h-0 flex-1 flex-col lg:w-1/3 lg:flex-none xl:w-1/4', selectedChatId ? 'hidden lg:flex' : 'flex')}>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
          {data.map((item) => (
            <ResultCard
              key={`${item.type}-${item.id}`}
              item={item}
              isActive={selectedChatId === item.conversationId && targetMessageId === item.id}
              onClick={handleCardClick}
            />
          ))}

          <div ref={loaderRef} className="h-10" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            icon={ChevronLeft}
            disabled={pagination?.page <= 1 || loading}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Anterior
          </Button>
          <span className="tnum font-mono text-xs text-fg-muted">Página {pageNumber}</span>
          <Button
            variant="outline"
            size="sm"
            iconRight={ChevronRight}
            disabled={!pagination?.hasMore || loading}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <div className={cn('min-h-0 flex-1 lg:flex-[2]', selectedChatId ? 'flex' : 'hidden lg:flex')}>
        <ChatViewerDetail
          conversationId={selectedChatId}
          targetMessageId={targetMessageId}
          searchQuery={searchParams.get('q') || ''}
          vendorName={selectedChat?.vendorName}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
