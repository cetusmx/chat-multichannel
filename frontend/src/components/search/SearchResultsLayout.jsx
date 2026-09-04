import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ResultCard from './ResultCard';
import ChatViewerDetail from '../chat/ChatViewerDetail';

export default function SearchResultsLayout({ data }) {
  if (!Array.isArray(data)) return <div>No data</div>;
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedChatId = searchParams.get('selectedChatId');
  const targetMessageId = searchParams.get('targetMessageId');

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
