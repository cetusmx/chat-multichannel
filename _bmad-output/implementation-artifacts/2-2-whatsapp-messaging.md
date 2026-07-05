# Epic 2: WhatsApp Communication - Implementation Artifact (Part 2)

## Contexto
Esta es la Historia 2.2, encargada de la lógica transaccional de mensajería (recepción, proceso y envío) mediante webhooks de Meta y la API de Graph.

## Historias de Usuario
- **FR36:** System receives messages from WhatsApp Business API via webhooks.
- **FR37:** System sends messages to clients through WhatsApp Business API.
- **FR38:** System handles media attachments in conversations.

---

## 1. Bases (B/M)
Los modelos de Prisma necesarios (`Client`, `Conversation`, `Message`, `Attachment`) ya fueron introducidos en la historia 2.1. 

## 2. Recepción de Mensajes (API)
Al recibir un POST en `/api/whatsapp/webhook/:tenantId`:
1. **Validación:** Comprobar que el JSON trae `entry[0].changes[0].value.messages`.
2. **Cliente:** Extraer el número del remitente y su nombre de perfil. Usar `prisma.client.upsert` para crearlo si no existe.
3. **Conversación:** Buscar una conversación `ACTIVE` o `PENDING_ASSIGNMENT` para este cliente. Si no existe, crear una nueva en estado `PENDING_ASSIGNMENT`.
4. **Mensaje:** Registrar el mensaje en la tabla `Message` vinculándolo a la conversación, con estado de entrega y `waMessageId`.
5. **Real-time:** Emitir evento `newMessage` vía Socket.io al namespace/room del tenant para notificar a la UI.

## 3. Envío de Mensajes (API)
Se creará un endpoint `POST /api/chat/:conversationId/messages`:
1. El backend buscará la `WhatsAppConfig` del tenant.
2. Formateará un request hacia la Graph API: `POST https://graph.facebook.com/v19.0/{PHONE_ID}/messages` utilizando el `accessToken`.
3. Guardará en Prisma el registro del mensaje con `senderType: VENDOR` o `IA`.

## 4. Diseño (Frontend)
- **ChatWindow:** Adaptar el componente de Chat UI para consumir `POST /api/chat/:id/messages`.
- **Socket Listener:** Escuchar en tiempo real y anexar el nuevo mensaje a la lista de mensajes mostrada.
