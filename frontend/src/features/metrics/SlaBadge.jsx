import React from 'react';

export default function SlaBadge({ isSlaBreached, breachType, className = '' }) {
  if (!isSlaBreached) return null;

  const isFirstResponse = breachType === 'firstResponse';
  const badgeColors = isFirstResponse 
    ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' 
    : 'bg-red-500/10 text-red-500 border border-red-500/20';

  const label = isFirstResponse ? 'SLA: 1ra Resp.' : 'SLA: Resolución';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors} ${className}`}>
      <span className={`mr-1 h-1.5 w-1.5 rounded-full ${isFirstResponse ? 'bg-orange-500' : 'bg-red-500'} animate-pulse`}></span>
      {label}
    </span>
  );
}
