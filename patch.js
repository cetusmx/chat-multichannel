const fs = require('fs');

function applyPatches() {
  // 1. ResultCard.jsx
  let rc = fs.readFileSync('frontend/src/components/search/ResultCard.jsx', 'utf8');
  if (!rc.includes('timeAgo')) {
    rc = rc.replace('const date = new Date(item.createdAt);', 
      'const timeAgo = (date) => { const s = Math.floor((new Date() - date) / 1000); if(s < 60) return "ahora"; if(s < 3600) return Math.floor(s/60) + "m"; if(s < 86400) return Math.floor(s/3600) + "h"; return Math.floor(s/86400) + "d"; };\n  const date = new Date(item.createdAt);');
    rc = rc.replace("{isValidDate ? date.toLocaleDateString() : 'Fecha desconocida'}", "{isValidDate ? timeAgo(date) : 'Fecha desconocida'}");
    rc = rc.replace("DOMPurify.sanitize(item.snippet", "DOMPurify.sanitize(item.snippet || item.body || item.content || 'Coincidencia en metadatos'");
    fs.writeFileSync('frontend/src/components/search/ResultCard.jsx', rc);
  }

  // 2. SearchResultsLayout.jsx
  let srl = fs.readFileSync('frontend/src/components/search/SearchResultsLayout.jsx', 'utf8');
  if (!srl.includes('IntersectionObserver')) {
    srl = srl.replace("const handleCardClick = (item) => {", "const handleCardClick = React.useCallback((item) => {");
    srl = srl.replace("setSearchParams(newParams, { replace: true });\n    }\n  };", "setSearchParams(newParams, { replace: true });\n    }\n  }, [searchParams, selectedChatId, targetMessageId, setSearchParams]);");
    srl = srl.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useRef } from 'react';");
    srl = srl.replace("const { pagination } = meta || {};", "const { pagination } = meta || {};\n  const loaderRef = useRef(null);\n  useEffect(() => {\n    const observer = new IntersectionObserver((entries) => {\n      if(entries[0].isIntersecting && pagination?.hasMore && !loading) onPageChange(pagination.page + 1);\n    }, { threshold: 1.0 });\n    if(loaderRef.current) observer.observe(loaderRef.current);\n    return () => observer.disconnect();\n  }, [loading, pagination, onPageChange]);");
    srl = srl.replace("{/* Pagination Controls */}", "<div ref={loaderRef} className=\"h-10\" />\n        {/* Pagination Controls */}");
    fs.writeFileSync('frontend/src/components/search/SearchResultsLayout.jsx', srl);
  }

  // 3. search.controller.js
  let sc = fs.readFileSync('backend/src/controllers/search.controller.js', 'utf8');
  sc = sc.replace("type: z.enum(['chats', 'clients', 'orders']).optional(),", "type: z.union([z.string(), z.array(z.string())]).optional(),");
  sc = sc.replace("page: z.coerce.number().int().min(1).default(1),", "page: z.coerce.number().int().min(1).max(1000).default(1),");
  sc = sc.replace("return query.replace(/[|&!*()<>:;]/g, ' ').replace(/\\s+/g, ' ').trim();", "return query.replace(/[^\\w\\s\\u00C0-\\u017F]/g, ' ').replace(/\\s+/g, ' ').trim();");
  fs.writeFileSync('backend/src/controllers/search.controller.js', sc);

  // 4. search.service.js
  let ss = fs.readFileSync('backend/src/services/search.service.js', 'utf8');
  ss = ss.replace("if (dateFrom && !isNaN(Date.parse(dateFrom))) {", "if (dateFrom) {\n    if (isNaN(Date.parse(dateFrom))) throw new Error('Invalid dateFrom format');");
  ss = ss.replace("if (dateTo && !isNaN(Date.parse(dateTo))) {", "if (dateTo) {\n    if (isNaN(Date.parse(dateTo))) throw new Error('Invalid dateTo format');");
  fs.writeFileSync('backend/src/services/search.service.js', ss);

  // 5. chat.routes.js
  let cr = fs.readFileSync('backend/src/routes/chat.routes.js', 'utf8');
  cr = cr.replace("if (currentConv && currentConv.tenantId === req.user.tenantId) {", "if (currentConv && currentConv.clientId && currentConv.tenantId === req.user.tenantId) {");
  fs.writeFileSync('backend/src/routes/chat.routes.js', cr);

  // 6. ChatViewerDetail.jsx
  let cvd = fs.readFileSync('frontend/src/components/chat/ChatViewerDetail.jsx', 'utf8');
  cvd = cvd.replace("useEffect(() => {\n    if (isFirstLoad.current", "useLayoutEffect(() => {\n    if (isFirstLoad.current");
  cvd = cvd.replace("key={msg.id}", "key={`${msg.id}-${index}`}");
  if (!cvd.includes('if(newMessages.length === 0)')) {
    cvd = cvd.replace("const newMessages = res.data.data;", "const newMessages = res.data.data;\n      if(newMessages.length === 0) {\n        if (type === 'previous') setMeta(prev => ({ ...prev, previousSessionId: null }));\n        else setMeta(prev => ({ ...prev, nextSessionId: null }));\n        return;\n      }");
  }
  fs.writeFileSync('frontend/src/components/chat/ChatViewerDetail.jsx', cvd);
  
  console.log("Patches applied successfully.");
}

applyPatches();
