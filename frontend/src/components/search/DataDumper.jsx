import React from 'react';
export default function DataDumper({ data, meta }) {
  let content = "Analyzing...";
  try {
    const analysis = {
      isDataArray: Array.isArray(data),
      dataType: typeof data,
      dataLength: data?.length,
      firstItemType: data && data.length > 0 ? typeof data[0] : null,
      metaType: typeof meta,
      paginationType: meta ? typeof meta.pagination : null
    };
    content = JSON.stringify({ analysis, firstItem: data && data[0] }, null, 2);
  } catch (e) {
    content = e.toString();
  }
  return <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-64 my-4">{content}</pre>;
}
