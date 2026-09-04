import React from 'react';

export default function SearchResultsLayout({ data }) {
  if (!Array.isArray(data)) return <div>No data</div>;
  return (
    <div>
      {data.map((item, i) => (
         <div key={i}>
           Item ID: {item && typeof item.id === 'string' ? item.id : 'no-id'}
         </div>
      ))}
    </div>
  );
}
