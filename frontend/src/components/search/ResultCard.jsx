import React from 'react';
export default function ResultCard({ item }) {
  return <div className="p-4 border">Card {item && item.id}</div>;
}
