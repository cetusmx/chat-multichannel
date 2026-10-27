# Contrato UI ↔ Backend (rediseño) — IMPLEMENTADO

Estado: backend y frontend conectados. Pendiente únicamente aplicar la migración
en cada entorno:

```bash
cd backend && npx prisma migrate deploy   # añade conversations.ai_summary / ai_summary_updated_at
```

## 1. Resumen del agente (pin arriba del chat)

- **Datos**: `Conversation.aiSummary: string | null`, `Conversation.aiSummaryUpdatedAt`.
- **Backend**: `services/summary.service.js`. Se genera en segundo plano cuando la IA
  transfiere a humano (`[[ESCALATE]]`) y cuando un coordinador asigna la conversación
  (`PATCH /chat/:id/assign`). Emite `conversation_updated` con la conversación completa.
- **Bajo demanda**: `POST /chat/:id/summary` → `{ data: { aiSummary, aiSummaryUpdatedAt } }`
  (422 si no hay mensajes o la IA no responde).
- **UI**: `AgentSummaryCard.jsx` lo muestra con botón de regenerar; si no existe,
  ofrece "Generar resumen del agente".
- Usa el proveedor de IA del tenant (`aiService.generateResponse`, sin tools). Máximo 320 caracteres.

## 2. Autor en notas internas / mensajes del equipo

- **Datos**: `Message.sender?: { id, name, role }` para `senderType` VENDOR/COORDINATOR/ADMIN.
- **Backend**: `services/messageEnricher.service.js` (`attachSenders`, lookup en lote).
  Aplicado en `GET /chat/:id/messages` (ambas variantes), en la creación de notas internas
  (texto y media) y en `whatsapp.service.sendMessage/sendMedia` antes de emitir `new_message`.
- **UI**: `MessageBubble.authorLabel` → `Luis (vendedor)`.

## 3. Eventos de línea de tiempo

- **Datos**: `Message { type: 'EVENT', senderType: 'SYSTEM', isInternal: true, content, metadata: { tone } }`.
  `isInternal` garantiza que nunca se envían a WhatsApp.
- **Backend**: `services/timeline.service.js` (`emitEvent`, `emitCartChanges`).
  Eventos emitidos hoy:
  | Origen | Texto |
  |---|---|
  | IA → `actualizar_carrito` | `El cliente agregó *X* a su pedido` / `cambió … de 2 a 5 piezas` / `quitó …` |
  | Vendedor edita carrito (`PATCH /clients/:id/cart`) | `Luis agregó *X* a su pedido` … |
  | IA transfiere (`[[ESCALATE]]`) | `La IA transfirió la conversación a *Luis*` |
  | IA inactiva / cuota agotada | `Transferido a *Luis* · IA inactiva` |
  | Coordinador asigna | `Rocío asignó la conversación a *Luis*` |
- **UI**: `MessageBubble.EventLine` (punto de color + texto, soporta `*negrita*`).
- La app móvil los verá como notas internas (texto plano); no requiere cambios.

## 4. Búsqueda libre de catálogo

- **Endpoint**: `GET /api/sealmarket/catalog/search?q=<texto>` (los parámetros paramétricos
  siguen funcionando sin `q`).
- **Backend**: `routes/sealmarket.routes.js` prueba, en orden, los nombres de parámetro
  `clave, q, descripcion, search` contra el ERP y filtra localmente por tokens en
  `CVE_ART / DESCR / DESC_ECOMM / NOMBRE / LIN_PROD`. Configurable con
  `CATALOG_TEXT_PARAMS="clave,descripcion"` cuando se confirme el nombre real que acepta
  `clavesalternas/filter-v2`.
- **UI**: `CatalogPanel.jsx`. Mapea `CVE_ART` → `clave` y `PRECIO × 1.16` → precio neto
  (misma regla que `CartViewer`).

## 5. Eyebrow de estado del chat

Usa campos existentes (`status`, `aiPendingEscalation`, `vendorId`, `lastMessageAt`).
Opcional a futuro: `transferredAt`, `observers[]` (presencia de coordinadores).

## 6. Correo de cotización

`CartViewer` pide el correo con `Modal` + `Input`; `POST /chat/quote/send-email` sin cambios.
`POST /chat/quote/generate` recibe `conversationId` opcional: si viene, además de devolver
el PDF lo envía por WhatsApp (comportamiento previo, ahora también desde `CatalogPanel`).
