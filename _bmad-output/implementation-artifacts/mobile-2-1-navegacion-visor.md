# Story 2.1: Navegación Push y Auto-Scroll al Contexto

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a vendedor o supervisor,
I want que al seleccionar un mensaje en los resultados de búsqueda de historial de chats, la aplicación navegue al visor de chat y haga scroll automático hasta el mensaje seleccionado,
so that pueda leer el contexto completo de la conversación sin tener que buscar manualmente la fecha o el mensaje específico.

## Acceptance Criteria

1. **Given** que el usuario está viendo los resultados de una búsqueda en el historial de chats
   **When** toca una tarjeta que representa un mensaje específico
   **Then** la app debe realizar una navegación tipo `Push` hacia la pantalla del visor de chat (`ChatViewerScreen`), pasando el `chatId` y el `messageId` (o `targetMessageId`) como parámetros.
2. **Given** que la pantalla `ChatViewerScreen` se monta con un `targetMessageId`
   **When** los mensajes son cargados en la interfaz
   **Then** la lista (`FlatList` o similar) debe desplazarse automáticamente (auto-scroll) hasta que el mensaje buscado sea visible en pantalla.
3. **Given** que la vista ha hecho scroll hasta el mensaje objetivo
   **Then** el componente del mensaje debe aplicar un efecto de resaltado visual temporal (ej. cambio de color de fondo que se desvanece gradualmente) para que el usuario ubique la burbuja exacta al instante.
4. **Given** el caso donde el `targetMessageId` no se encuentre localmente (primera carga)
   **When** se abre la pantalla del chat
   **Then** el cliente debe solicitar al backend los mensajes alrededor de ese mensaje. Si el mensaje fue eliminado o no se encuentra en el backend, se debe mostrar un toast ("El mensaje ya no está disponible") y cargar los mensajes más recientes.
5. **Given** un intento de navegación con parámetros incompletos
   **Then** si `chatId` es nulo o inválido, la navegación debe bloquearse o mostrar un error; si `targetMessageId` es nulo o indefinido, la pantalla debe hacer fallback a su comportamiento por defecto (scrollear al mensaje más reciente).

## Tasks / Subtasks

- [ ] Task 1: Configurar la Navegación y Validación de Parámetros (AC: 1, 5)
  - [ ] En los resultados, usar `navigation.push('ChatViewerScreen', { chatId, targetMessageId })`.
  - [ ] Validar que `chatId` exista antes de despachar la navegación (mostrar error si no).
  - [ ] En `ChatViewerScreen`, leer los parámetros y si `targetMessageId` falta, aplicar fallback a carga normal.
- [ ] Task 2: Implementar Carga de Contexto y Auto-Scroll (AC: 2, 4)
  - [ ] Implementar un mecanismo de prevención (lock/debounce) para ignorar toques repetidos desde la búsqueda si ya hay una navegación y secuencia de scroll en progreso.
  - [ ] **Crítico para memoria (Bidirectional Pagination):** Si el mensaje no está en la memoria local reciente, no cargar cientos de mensajes intermedios. Usar `targetMessageId` como cursor ancla para hacer un fetch de un "slice" de mensajes (ej. 20 antes y 20 después) y renderizar ese bloque inicial.
  - [ ] Calcular el índice del mensaje, teniendo en cuenta que la lista usa `inverted={true}` (el índice 0 es el mensaje más reciente abajo, por lo que el cálculo debe usar el orden invertido del array).
  - [ ] Utilizar la referencia (`useRef`) de la `FlatList` para llamar a `scrollToIndex`.
  - [ ] **Crítico:** Implementar el callback `onScrollToIndexFailed` en la `FlatList` para evitar crashes "out of range" con elementos de altura variable. En el fallback, hacer scroll a un offset aproximado y reintentar `scrollToIndex` tras un breve timeout.
  - [ ] Prevenir race conditions: verificar que el componente siga montado y el `chatId` siga siendo el mismo antes de ejecutar el auto-scroll.
- [ ] Task 3: Efecto de Resaltado de la Burbuja de Mensaje (AC: 3)
  - [ ] Modificar `ChatMessageBubble` para aceptar una propiedad `highlighted={true}`.
  - [ ] Implementar la animación nativa de interpolación de color *estrictamente* usando `useAnimatedStyle` de **Reanimated** para que corra exclusivamente en el UI thread y no bloquee el hilo JS durante la carga inicial de los mensajes.
  - [ ] Garantizar que el efecto sea estrictamente transitorio: solo debe ejecutarse una vez tras el auto-scroll inicial, sin repetirse si el componente se re-renderiza o si el usuario scrollea fuera y vuelve al elemento.
- [ ] Task 4: Accesibilidad (A11y)
  - [ ] **Manejo de Foco:** Después de que el scroll termine y el layout se haya calculado, usar `AccessibilityInfo.setAccessibilityFocus(ref)` para mover el foco del lector de pantallas directamente a la burbuja del mensaje buscado.
  - [ ] **Anuncios de Estado:** Utilizar `AccessibilityInfo.announceForAccessibility()` para informar al usuario los estados del sistema (ej. anunciar "Navegando al mensaje..." durante la carga/scroll, y "Mensaje encontrado" al terminar).
  - [ ] **Contexto del Resaltado:** En la burbuja objetivo (cuando `highlighted={true}`), modificar temporalmente el `accessibilityLabel` para agregar el prefijo "Mensaje resaltado: " asegurando que los usuarios con discapacidad visual comprendan el contexto del foco.
- [ ] Task 5: Rendimiento y Prevención de Picos de Memoria
  - [ ] **Paginación Bidireccional:** Asegurar que la implementación de Task 2 sustituya la caché activa del chat por el "slice" contextual para evitar un render spike masivo (frame drops) al saltar a mensajes muy antiguos.

## Dev Notes

- **Architecture Constraints:** Al realizar scroll programático, se debe tener cuidado con las listas invertidas (`inverted={true}` comúnmente usadas en chats) ya que los índices y la dirección cambian.
- **Source tree components to touch:**
  - `mobile/src/screens/ChatHistorySearchScreen.js`
  - `mobile/src/screens/ChatViewerScreen.js`
  - `mobile/src/components/ChatMessageBubble.js`

### Project Structure Notes

- **Alignment:** Seguir el estándar de animaciones definido en el ecosistema (Reanimated recomendado).

### References

- Épica Móvil: `epic-busqueda-movil.md`

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
