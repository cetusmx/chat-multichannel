# Story US-2.2: Sincronización Master-Detail y Visor de Chat

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a usuario web,
I want previsualizar el historial completo de una conversación en el panel derecho (Detail) y ser llevado directamente al mensaje que originó el resultado de búsqueda,
so that pueda evaluar rápidamente el contexto del mensaje sin tener que hacer scroll manualmente por todo el chat.

## Acceptance Criteria

1. **Given** una tarjeta seleccionada en el panel izquierdo (Master)
   **When** el parámetro `selectedChatId` y `targetMessageId` se encuentran en la URL
   **Then** el panel derecho (Detail) debe cargar y renderizar la sesión de chat correspondiente, reemplazando el placeholder.
2. **Given** el visor de chat pre-cargando los mensajes
   **When** el renderizado inicial finaliza
   **Then** el visor debe realizar un auto-scroll automático para centrar el `targetMessageId` en la pantalla. Si el parámetro `targetMessageId` no existe, el visor debe hacer scroll al último mensaje (más reciente).
3. **Given** el auto-scroll completado (y `targetMessageId` provisto)
   **Then** el mensaje específico debe tener una indicación visual temporal (ej. un fondo que parpadea o se desvanece, o un borde resaltado) para que el usuario localice instantáneamente la coincidencia.
4. **Given** un usuario navegando en móvil o pantalla pequeña
   **When** se selecciona un resultado
   **Then** la UI debe transicionar para que el Visor de Chat (Detail) ocupe toda la pantalla, ocultando la lista (Master), y proveyendo un botón de "Atrás" en el header para regresar.
5. **Given** un error al cargar el chat (ej. 404 No Encontrado o 403 Sin Permisos)
   **Then** el panel Detail debe mostrar un estado de error explícito ("El chat no existe o no tienes acceso") en lugar de un área en blanco o un crash.

## Tasks / Subtasks

- [ ] Task 1: Componente Visor y Carga de Datos Contextual (`ChatViewerDetail`) (AC: 1, 5)
  - [ ] Consumir los parámetros `selectedChatId` y `targetMessageId` de la URL.
  - [ ] **Fetching Contextual (Crítico):** La petición a la API no debe cargar simplemente los últimos mensajes (el mensaje objetivo podría ser de hace meses y no estar en el DOM). El backend/frontend debe solicitar el contexto específico (página) que rodea al `targetMessageId` para garantizar su renderizado.
  - [ ] **Caché y Performance:** Al usar SWR/React Query, configurar un `staleTime` conservador (ej. 5-10 minutos) para data histórica. Esto evita refetches en background agresivos al cambiar rápidamente de chat, conservando ancho de banda y previniendo saltos de scroll inesperados.
  - [ ] Mostrar *loaders* (skeletons) apropiados durante la carga inicial.
  - [ ] Implementar un componente de Error para manejar respuestas fallidas (404, 403, 500).
- [ ] Task 2: Auto-Scroll Seguro, Renderizado y Foco Visual (AC: 2, 3)
  - [ ] Identificar el mensaje objetivo usando el `targetMessageId` pasado como parámetro.
  - [ ] **Optimización de Renderizado:** Si el fetch retorna muchos mensajes, usar una librería de virtualización (ej. `react-virtuoso`) o renderizar la lista dentro de un `startTransition` (React 18) para evitar bloquear el *Main Thread* y congelar la UI.
  - [ ] **Fallback de Scroll:** Si no hay `targetMessageId`, hacer scroll suavemente al fondo del contenedor (mensajes más recientes).
  - [ ] **Timing del DOM (Gotcha):** Asegurar que `scrollIntoView` se ejecute *después* de que React haya pintado los nodos. Obligatorio utilizar un callback `ref` directamente en el componente del mensaje objetivo, o un `useLayoutEffect` que dependa de la longitud de la lista.
  - [ ] **Posicionamiento:** Configurar explícitamente el scroll para centrar el elemento en pantalla (`scrollIntoView({ behavior: 'smooth', block: 'center' })`), evitando que quede oculto bajo headers pegajosos.
  - [ ] **Foco Programático (A11y Crítico):** Una vez realizado el scroll, mover el foco del DOM (`element.focus()`) directamente al contenedor del mensaje objetivo (asegurando que tenga `tabIndex={-1}`) para que los lectores de pantalla comiencen a leer el contexto inmediatamente.
  - [ ] **Animación Re-triggerable:** Aplicar una animación CSS (keyframe pulse/fade) al componente objetivo.
  - [ ] **Prevención de Leaks:** Limpiar explícitamente cualquier `setTimeout` o `requestAnimationFrame` usado para coordinar el scroll o la animación en la función de *cleanup* del `useEffect` para evitar memory leaks si el componente se desmonta prematuramente.
- [ ] Task 3: Responsividad (Navegación Móvil) (AC: 4)
  - [ ] Ajustar el Layout Master-Detail: En pantallas pequeñas (`< 768px`), si `selectedChatId` está presente, aplicar estilos para que la columna derecha ocupe 100vw y la izquierda `display: none`.
  - [ ] Integrar un botón "Atrás" en el `Header` del visor (solo visible en móvil). **A11y:** Añadir `aria-label="Volver a los resultados de búsqueda"`.
  - [ ] **Restauración de Foco:** Al clickear "Atrás" y limpiar el `selectedChatId`, el foco del navegador debe regresar programáticamente a la tarjeta de resultado que fue seleccionada originalmente en la vista Master.
- [ ] Task 4: Anuncios de Estado (A11y)
  - [ ] Implementar regiones `aria-live` (o usar librerías como `react-aria-live`) para anunciar verbalmente los cambios de estado: "Cargando chat..." al iniciar la petición, y "Chat cargado y mensaje encontrado" (o "Chat cargado") al finalizar.

## Dev Notes

- **Architecture Constraints:**
  - El Visor de Chat aquí es probablemente una versión de "Sólo Lectura" o "Previsualización" del visor de chat real usado en el CRM. Coordinar la reutilización de componentes UI base.
- **Source tree components to touch:**
  - `web/src/pages/SearchPage.tsx`
  - `web/src/components/search/SearchResultsLayout.tsx`
  - `web/src/components/search/ChatViewerDetail.tsx` (Nueva)

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
