export default function DataDumper({ data, meta }) {
  let content = 'Analizando...';
  try {
    const analysis = {
      isDataArray: Array.isArray(data),
      dataType: typeof data,
      dataLength: data?.length,
      firstItemType: data && data.length > 0 ? typeof data[0] : null,
      metaType: typeof meta,
      paginationType: meta ? typeof meta.pagination : null,
    };
    content = JSON.stringify({ analysis, firstItem: data && data[0] }, null, 2);
  } catch (e) {
    content = e.toString();
  }
  return (
    <pre className="my-4 max-h-64 overflow-auto rounded-lg border border-border bg-surface-2 p-4 font-mono text-xs leading-relaxed text-fg-muted custom-scrollbar">
      {content}
    </pre>
  );
}
