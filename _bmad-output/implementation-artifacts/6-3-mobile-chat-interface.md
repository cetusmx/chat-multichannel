---
baseline_commit: 88ad9e2aea8e258ffe284307a89f1fa8be49a5d5
---

# Story 6.3: Mobile Chat Interface

Status: done

## Story

As a Vendor,
I want to chat with clients easily from my phone,
so that I can work remotely (UX-DR12).

## Acceptance Criteria

1. **Given** the mobile app, **When** I open a chat, **Then** I can see the history, send texts, and send images using mobile touch gestures.

## Tasks / Subtasks

- [x] Task 1: Chat List Screen Integration
  - [x] Subtask 1.1: Fetch conversations using the `api` service (GET `/api/conversations`) and display them in `ChatListScreen` using a `FlatList`. MUST implement a `ListEmptyComponent` (e.g., "No tienes chats asignados") to avoid a blank screen.
  - [x] Subtask 1.2: Style the chat list items to display client name, last message, and unread status. Add pull-to-refresh functionality using the standard `<RefreshControl>` linked to a `refreshing` state.
  - [x] Subtask 1.3: Enable navigation from a chat list item to `ChatDetailScreen`, passing the `chatId` and `clientName` as route parameters. Dynamically set the React Navigation header title to the `clientName`.
- [x] Task 2: Chat Detail Screen - History & Real-time
  - [x] Subtask 2.1: Implement socket.io connection in mobile. Create a custom hook `useMobileSocket` that retrieves the auth token (via Zustand `useAuthStore` or `AsyncStorage`) and passes it in `auth: { token }` during the socket handshake. CRITICAL: Force `transports: ['websocket']` to prevent RN long-polling bugs, and MUST include cleanup (`socket.disconnect()`) on unmount/logout to prevent memory leaks.
  - [x] Subtask 2.2: Fetch paginated conversation history (GET `/api/conversations/:id/messages?page=1&limit=50`) when `ChatDetailScreen` mounts. Display messages in a `FlatList` (inverted) and trigger next page fetch using `onEndReached`. CRITICAL: Add `keyboardShouldPersistTaps="handled"`, a friendly `ListEmptyComponent`, AND memory optimization props (`initialNumToRender`, `maxToRenderPerBatch`, `windowSize`) to prevent Out of Memory crashes when loading images.
  - [x] Subtask 2.3: Listen to `new_message` socket events to update the conversation history in real-time. CRITICAL: Implement deduplication by `message.id` in the `FlatList` data state to prevent the vendor from seeing their own sent messages duplicated when the socket broadcasts them back.
- [x] Task 3: Message Sending & Media
  - [x] Subtask 3.1: Implement a `TextInput` area at the bottom of `ChatDetailScreen` to send text messages (POST `/api/conversations/:id/messages`). Must use `multiline={true}` with a `maxHeight` boundary.
  - [x] Subtask 3.2: Integrate an image picker (`react-native-image-picker`). CRITICAL: Add `NSPhotoLibraryUsageDescription` to iOS `Info.plist` and `READ_MEDIA_IMAGES`/`READ_EXTERNAL_STORAGE` to Android `AndroidManifest.xml` to prevent crashes.
  - [x] Subtask 3.3: Implement image uploading using `FormData` to the same endpoint, supporting `multipart/form-data`. CRITICAL: Modify `mobile/src/services/api.js` to conditionally omit `Content-Type: application/json` when the body is a `FormData` instance, otherwise uploads will fail.
  - [x] Subtask 3.4: In `MessageItem.jsx`, align messages to the RIGHT if `senderType === 'VENDOR'` and to the LEFT if `'CLIENT'`, using distinct bubble colors. Conditionally render `<Image>` if the payload contains a media URL (with loading placeholders).
- [x] Task 4: UX & Gestures (UX-DR12)
  - [x] Subtask 4.1: Wrap the `ChatListScreen` and `ChatDetailScreen` in `<SafeAreaView>` (from `react-native-safe-area-context`) to prevent UI collision with device notches. Wrap the chat view in `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>`. CRITICAL: Add `keyboardDismissMode="on-drag"` to the `FlatList` so the keyboard dismisses natively when the user scrolls the history.
  - [x] Subtask 4.2: Implement visual feedback for sent messages (e.g., tick marks or state updates: sending, sent).

## Dev Notes

- Relevant architecture patterns and constraints:
  - Mobile project uses bare React Native (not Expo).
  - API requests must use the pre-configured `mobile/src/services/api.js`.
  - Socket.io-client must be installed in the mobile workspace if not already present.
  - **Push Notification Integration**: `ChatDetailScreen` must gracefully handle being mounted with a `chatId` from initial route params when waking up from a notification (Story 6.2).
- Source tree components to touch:
  - `mobile/package.json`
  - `mobile/src/screens/ChatListScreen.jsx`
  - `mobile/src/screens/ChatDetailScreen.jsx`
  - `mobile/src/hooks/useMobileSocket.js` (new)
  - `mobile/src/components/MessageItem.jsx` (new)
  - `mobile/src/components/ChatInput.jsx` (new)
- Testing standards summary:
  - Ensure image uploads correctly construct `FormData` with `uri`, `type`, and `name`.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming):
  - Follows `mobile/src/screens` and `mobile/src/components` conventions.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6: Mobile Experience]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]

## Dev Agent Record

### Agent Model Used
Antigravity 2.0 (Gemini Experimental)

### Debug Log References

### Completion Notes List
- Completed all chat list and detail screens exactly as designed in validations.
- Configured mobile socket connections using proper websocket transport and token authorization.
- Added all necessary permissions for iOS and Android camera rolls.
- Wrapped necessary components in SafeAreaView and KeyboardAvoidingView.

### File List
- mobile/package.json
- mobile/src/screens/ChatListScreen.jsx
- mobile/src/screens/ChatDetailScreen.jsx
- mobile/src/hooks/useMobileSocket.js
- mobile/src/components/MessageItem.jsx
- mobile/src/components/ChatInput.jsx
- mobile/ios/mobile/Info.plist
- mobile/android/app/src/main/AndroidManifest.xml
- mobile/src/services/api.js

### Review Findings

- [x] [Review][Patch] Falta validación inicial del chatId en ChatDetailScreen [mobile/src/screens/ChatDetailScreen.jsx:50]
- [x] [Review][Patch] Errores silenciosos (sin Toast/Feedback visual) al fallar fetchConversations, handleSendText y handleSendMedia [mobile/src/screens/ChatListScreen.jsx:25]
- [x] [Review][Patch] UI Optimista ausente al subir Media. El usuario no sabe que la imagen está subiéndose [mobile/src/screens/ChatDetailScreen.jsx:128]
- [x] [Review][Patch] Posible Race Condition en mensajes de texto si el socket emite el mismo mensaje antes de que resuelva el HTTP [mobile/src/screens/ChatDetailScreen.jsx:105]
- [x] [Review][Patch] Error en preview de ChatListScreen si el último mensaje es solo Media [mobile/src/screens/ChatListScreen.jsx:45]
- [x] [Review][Patch] KeyboardAvoidingView en iOS necesita keyboardVerticalOffset debido a SafeArea [mobile/src/screens/ChatDetailScreen.jsx:152]
- [x] [Review][Patch] ChatDetailScreen no limpia los mensajes previos si cambia el chatId sin desmontarse [mobile/src/screens/ChatDetailScreen.jsx:75]
- [x] [Review][Patch] Falta solicitar permisos en Runtime para Android (PermissionsAndroid) antes de abrir galería [mobile/src/components/ChatInput.jsx:21]
### Review Findings (V2)

- [x] [Review][Patch] Race condition en UI Optimista de mensajes (Socket vs HTTP POST duplicate) [mobile/src/screens/ChatDetailScreen.jsx:105]
- [x] [Review][Patch] Falta codificar el cursor en la URL (URI encoding) [mobile/src/screens/ChatDetailScreen.jsx:165]
- [x] [Review][Patch] ChatListScreen no refresca al volver de un chat (falta useFocusEffect) [mobile/src/screens/ChatListScreen.jsx:20]
- [x] [Review][Patch] Info.plist no tiene NSCameraUsageDescription, lo que causa crash en iOS si el picker abre la cámara [mobile/ios/mobile/Info.plist]
- [x] [Review][Patch] FlatList usa estilos condicionales abruptos (flexGrow vs padding) causando Layout Shift [mobile/src/screens/ChatDetailScreen.jsx:162]
- [x] [Review][Patch] useMobileSocket recibe una función inline que se recrea en cada render, causando posibles fugas o desincronización [mobile/src/screens/ChatDetailScreen.jsx:42]
### Review Findings (V3)

- [x] [Review][Patch] Falta `<uses-permission android:name="android.permission.CAMERA" />` en AndroidManifest.xml [mobile/android/app/src/main/AndroidManifest.xml]
- [x] [Review][Patch] Parchear la UI optimista para actualizar a 'sent' si el HTTP gana, o borrar temp si el socket gana (Evita parpadeo y race condition) [mobile/src/screens/ChatDetailScreen.jsx]
- [x] [Review][Patch] Falta validación `!chatId` en handleSendText y handleSendMedia [mobile/src/screens/ChatDetailScreen.jsx]
- [x] [Review][Patch] Riesgo de duplicados al paginar mensajes que el socket ya inyectó [mobile/src/screens/ChatDetailScreen.jsx:62]
- [x] [Review][Defer] ChatListScreen no tiene socket en vivo, fetch en focus es ineficiente — deferred, comportamiento de MVP
### Review Findings (V4)

- [x] [Review][Patch] Fetch inicial de fetchMessages sobreescribe mensajes del socket (sustituye prev por data.data) [mobile/src/screens/ChatDetailScreen.jsx]
- [x] [Review][Patch] Info.plist no tiene NSMicrophoneUsageDescription, posible crash al usar el ImagePicker [mobile/ios/mobile/Info.plist]
- [x] [Review][Patch] renderItem en FlatList no usa React.memo ni useCallback, causando re-renders masivos [mobile/src/screens/ChatDetailScreen.jsx]
### Review Findings (V5)

- [x] [Review][Patch] Generación de IDs temporales con Date.now() en ráfaga puede causar colisiones (usar Math.random()) [mobile/src/screens/ChatDetailScreen.jsx]
- [x] [Review][Patch] Falta validación Array.isArray(data.data) al recibir data del backend, riesgo de crash por spread no iterable [mobile/src/screens/ChatDetailScreen.jsx]
### Review Findings (V6)

- [x] [Review][Patch] Falta `<uses-permission android:name="android.permission.RECORD_AUDIO" />` en AndroidManifest.xml (crash en video) [mobile/android/app/src/main/AndroidManifest.xml]
- [x] [Review][Patch] chatId no usa encodeURIComponent en los endpoints de ChatDetailScreen [mobile/src/screens/ChatDetailScreen.jsx]
- [x] [Review][Patch] Falta trim y validación en handleSendText (!text.trim()) y handleSendMedia (!file.uri) [mobile/src/screens/ChatDetailScreen.jsx]
### Review Findings (V7)

- [x] [Review][Patch] Faltan permisos `READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO` y `maxSdkVersion` para Android 13+ [mobile/android/app/src/main/AndroidManifest.xml]
- [x] [Review][Patch] Riesgo de navegar a chat defectuoso si `item.id` es null [mobile/src/screens/ChatListScreen.jsx]
- [ ] [Review][Defer] Refactorización de diseño para componente vacío sin usar `scaleY: -1` — deferred, post-MVP