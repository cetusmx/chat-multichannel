import React from 'react';
import ResultCard from './ResultCard';

export default function SearchResultsLayout({ data }) {
  if (!Array.isArray(data)) return <div>No data</div>;
  return (
    <div className="flex flex-col space-y-4 p-4">
      {data.map((item, i) => (
        <ResultCard 
          key={i} 
          item={item} 
          isActive={false}
          onClick={() => {}}
        />
      ))}
    </div>
  );
}
