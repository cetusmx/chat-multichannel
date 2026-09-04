# Story US-2.3: Tarjetas de Sesión Contigua y Expansión In-Place Web

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a usuario de la plataforma web,
I want ver un indicador al inicio o final del visor de chat si existen conversaciones adyacentes (anteriores o posteriores) y poder expandirlas directamente en la misma vista,
so that pueda continuar leyendo el contexto extendido de la relación con el cliente sin necesidad de cambiar de pantalla o perder el hilo de lectura actual.

## Acceptance Criteria

1. **Given** un chat cargado en el panel derecho (Visor de Chat)
   **When** el usuario hace scroll hacia el tope (límite superior) o fondo (límite inferior) del historial visible
   **Then** debe visualizarse una tarjeta (`ContiguousSessionCard`) que indique la existencia de una sesión adyacente, mostrando su fecha. **Si el backend indica que no hay sesiones adyacentes (`previousSessionId: null` o `nextSessionId: null`), la tarjeta NO debe renderizarse (límite absoluto).**
2. **Given** la tarjeta de sesión contigua
   **When** el usuario hace clic en la tarjeta o en su botón "Cargar"
   **Then** la tarjeta debe transicionar a un estado visual de carga (loading spinner o skeleton).
3. **Given** que la petición de la sesión contigua se completa exitosamente
   **Then** los mensajes de esa sesión deben insertarse directamente en el historial actual (al principio o al final) de forma fluida (in-place), reemplazando la tarjeta de carga.
4. **Given** un fallo al intentar cargar la sesión adyacente
   **Then** la tarjeta debe mostrar un estado de error (ej. texto rojo) y permitir al usuario reintentar la acción haciendo clic nuevamente.
5. **Given** una sesión contigua que no contiene mensajes renderizables (vacía)
   **Then** el sistema debe manejarlo automáticamente (intentando cargar la siguiente sesión contigua o simplemente ocultando la tarjeta de forma elegante) para evitar dejar al usuario atascado en un "Load More" que no hace nada.

## Tasks / Subtasks

- [ ] Task 1: Componente `ContiguousSessionCard` y Semántica (AC: 1, 2, 4)
  - [ ] Maquetar la tarjeta de frontera de sesión (diseño colapsado estilo acordeón/separador). **A11y:** Usar un elemento nativo `<button>` o `role="button"`.
  - [ ] Manejar los estados locales: `idle`, `loading`, `error`.
  - [ ] **Spam Prevention & A11y:** Mientras cargue (`loading`), deshabilitar `onClick` y añadir `aria-busy="true"` y `aria-disabled="true"` para notificar a lectores de pantalla.
  - [ ] **Error UX:** Si falla, mostrar el texto de error acompañado explícitamente de un ícono de "Reintentar" (ej. flecha circular) para indicar que la tarjeta sigue siendo interactiva.
- [ ] Task 2: Expansión In-Place (Lógica de Datos) (AC: 3, 5)
  - [ ] Implementar la petición a la API para obtener los mensajes de la sesión anterior o siguiente basándose en el ID de la sesión actual o cursores.
  - [ ] Integrar el array resultante (prepend para sesiones anteriores, append para sesiones siguientes) en el estado de mensajes del `ChatViewerDetail`.
  - [ ] **State Batching:** Asegurar que el cambio de estado local (`isLoading: false`) y la actualización del gran array de mensajes se ejecuten agrupados (batched) o en un solo reducer para evitar dobles renders pesados.
  - [ ] **Separador Visual:** Insertar un componente no interactivo (ej. "Separador de Fecha" o "Inicio de Sesión") en el índice exacto donde se fusionaron ambos arrays para preservar el contexto temporal del usuario.
  - [ ] **Empty Session Trap:** Añadir lógica que si el resultado del fetch tiene 0 mensajes, dispare automáticamente la carga del cursor siguiente u oculte el card permanentemente, evitando estados rotos.
- [ ] Task 3: Preservación de Posición de Scroll y Foco (UX y A11y Crítica)
  - [ ] **El Problema del Prepend:** Si se insertan nodos en la parte superior del DOM (sesión anterior), el scroll saltará violentamente hacia abajo.
  - [ ] **Solución (Virtualización):** Se recomienda encarecidamente usar una librería (ej. `react-virtuoso`) manejando la propiedad `firstItemIndex` para anclar el scroll bidireccional automáticamente.
  - [ ] **Solución (Nativa):** Si se usa scroll nativo, la lógica de compensación de `scrollTop` DEBE ejecutarse síncronamente dentro de un `useLayoutEffect`, calculando la diferencia de altura antes y después del render para evitar flickering visual por imágenes asíncronas.
  - [ ] **Manejo de Foco al Desmontar (A11y):** Cuando la `ContiguousSessionCard` se desmonta tras una carga exitosa, trasladar el foco programáticamente (`element.focus()`, `tabIndex={-1}`) al "Separador de Fecha" insertado o al primer mensaje nuevo, previniendo que los lectores de pantalla pierdan su lugar.
- [ ] Task 4: Anuncios de Estado (A11y)
  - [ ] Implementar regiones `aria-live="polite"` (o `react-aria-live`) para anunciar: "Cargando mensajes anteriores..." (estado de carga) y "Error al cargar, presione enter para reintentar" (estado de error).

## Dev Notes

- **Architecture Constraints:**
  - Los mensajes insertados in-place son efímeros para la vista actual. Si el usuario recarga la página, el visor se reiniciará con el `selectedChatId` base.
  - **Pruning (Límites de Memoria/Nodos DOM):** Para evitar crasheos OOM (Out Of Memory) si el usuario expande docenas de sesiones, se DEBE implementar un límite máximo de mensajes (ej. `MAX_MESSAGES = 400`). Si el array fusionado supera el límite, podar (slice) el array por el extremo opuesto al de inserción y volver a renderizar una `ContiguousSessionCard` en esa frontera podada.
  - **Reconciliación y Colisión de Keys:** Es altamente probable que diferentes sesiones usen IDs secuenciales conflictivos. Al mapear los mensajes, es obligatorio generar y usar un `key` compuesto globalmente único (ej. `key={`${session.id}-${msg.id}`}`) para evitar errores fatales de reconciliación en React.
- **Source tree components to touch:**
  - `web/src/components/chat/ContiguousSessionCard.tsx` (Nueva)
  - `web/src/components/chat/ChatViewerDetail.tsx` (Modificar estado para soportar merging)

### Project Structure Notes

- **Alignment:** 

### References

- Épica Web Global: `epic-busqueda-global.md`

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
