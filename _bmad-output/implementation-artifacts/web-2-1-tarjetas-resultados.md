# Story US-2.1: Tarjetas de Resultados - Columna Izquierda

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a usuario de la plataforma web,
I want ver una lista de tarjetas en la columna izquierda mostrando coincidencias de mensajes con el contexto resaltado,
so that pueda escanear visualmente los resultados y seleccionar uno para previsualizar el historial completo en el panel derecho.

## Acceptance Criteria

1. **Given** que la búsqueda global retorna resultados de chats
   **Then** el frontend debe renderizar una lista apilada de tarjetas (`ResultCard`) en la columna izquierda. Cada tarjeta debe mostrar el Nombre del Cliente (o un fallback si falta), la fecha relativa, y el `snippet` del mensaje.
2. **Given** el texto del `snippet` devuelto por el backend
   **Then** el componente debe renderizar visualmente el término de búsqueda resaltado con un fondo amarillo. Si el `snippet` es nulo o vacío (ej. coincidencia en teléfono), la tarjeta debe mostrar un extracto del cuerpo original del mensaje o indicar "Coincidencia en metadatos".
3. **Given** la lista de tarjetas renderizada
   **When** el usuario hace clic en una tarjeta inactiva
   **Then** la tarjeta debe adoptar un estilo visual de "Activa", y la URL debe actualizarse con el ID seleccionado (ej. `?selectedChatId=456`) para disparar la carga en el panel derecho. Si hace clic en una tarjeta ya activa, esta debe deseleccionarse limpiando el parámetro de la URL.
4. **Given** un volumen alto de resultados
   **Then** la columna izquierda debe implementar paginación (ej. *Infinite Scroll* al llegar al final de la lista) para cargar el siguiente bloque de coincidencias sin recargar la página entera.
5. **Given** datos incompletos en el payload de la API
   **Then** la UI debe proveer defaults amigables (ej. "Contacto Desconocido", fechas robustas) y nunca crashear.
6. **Given** que la página carga sin un resultado seleccionado (`selectedChatId` vacío)
   **Then** el layout debe mostrar un *placeholder* claro en el panel derecho (ej. "Selecciona un resultado de la lista para ver los detalles").

## Tasks / Subtasks

- [ ] Task 1: Maquetación y Fallbacks del Componente `ResultCard` (AC: 1, 2, 5)
  - [ ] **Nombres:** Crear la estructura visual mostrando avatar/nombre. Si el nombre es `null`, usar explícitamente el número de teléfono o "Contacto Desconocido".
  - [ ] **Fechas Seguras:** Formatear la fecha en formato relativo (ej. "hace 2h"). Envolver el parseo en un bloque `try/catch` (o helper seguro); si el timestamp es inválido, usar "Fecha desconocida" para evitar crashes en la vista.
  - [ ] **Fallback de Snippet:** Mostrar el `snippet`. Si es nulo o vacío, renderizar el texto crudo del último mensaje truncado.
  - [ ] **Truncamiento (Line Clamping):** Aplicar CSS para truncar el snippet a un máximo de líneas (ej. Tailwind `line-clamp-2` o `line-clamp-3`) para mantener la altura uniforme de la tarjeta.
  - [ ] Implementar estilos para diferenciar el estado *default*, *hover* y *activo* (selected).
  - [ ] **Optimización de Render (Crítico):** Envolver el componente en `React.memo` para prevenir re-renders innecesarios cuando cambia el estado de otras tarjetas. Recibir props primitivos (ej. `isActive={true/false}`) en lugar de objetos complejos.
- [ ] Task 2: Renderizado Seguro del Resaltado (Highlighting)
  - [ ] Desarrollar un mecanismo para inyectar el `snippet` (que puede contener etiquetas como `<mark>` o `<b>` del backend).
  - [ ] **Manejo de Saltos de Línea:** Aplicar CSS `white-space: pre-wrap` al contenedor del snippet para respetar los caracteres `\n` devueltos por el backend, o reemplazarlos de forma segura por `<br/>` antes de sanitizar.
  - [ ] **Crítico (Anti-XSS):** Sanitizar el string usando DOMPurify antes de inyectarlo vía `dangerouslySetInnerHTML`. **Configuración Estricta:** Configurar explícitamente DOMPurify con una allowlist cerrada (`ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark', 'br']`) y deshabilitar todos los atributos (`ALLOWED_ATTR: []`) para evitar ataques inyectando `onload` o scripts maliciosos.
- [ ] Task 3: Lista y Manejo de Estado (Master Column) (AC: 3, 4, 6)
  - [ ] Crear el contenedor de la lista que itere sobre los resultados. Implementar un *placeholder* para el panel derecho si no hay selección.
  - [ ] Derivar la "tarjeta activa" leyendo el parámetro `selectedChatId` de la URL y pasar el flag booleano `isActive` a la tarjeta correspondiente.
  - [ ] **Shallow Routing y Callbacks:** Manejar el `onClick`. Si se pasa una función desde el padre, debe estar memoizada con `useCallback` (o manejar el enrutamiento internamente en la tarjeta) para no romper el `React.memo`. La navegación debe ser "shallow" (`{ shallow: true }`) para no recargar la página ni perder el scroll.
  - [ ] Implementar la detección de fin de scroll (`IntersectionObserver`) para solicitar la siguiente página.

## Dev Notes

- **Architecture Constraints:**
  - El estado activo debe derivarse de la URL para garantizar que al recargar la página (o compartir el link), se reabra el panel derecho correcto.
  - **Hydration Mismatches (SSR):** Si se utiliza Next.js/SSR, la sanitización con DOMPurify puede diferir entre el servidor (Node) y el cliente (Navegador), causando errores de hidratación en React. Asegurar que la sanitización sea isomórfica o renderizar el componente estrictamente post-hidratación (Client-Side Only).
  - **Virtualización (Performance):** Aunque Task 3 menciona `IntersectionObserver` para *Infinite Scroll*, si se espera que la lista supere los 100 elementos cargados simultáneamente, se recomienda encarecidamente utilizar una librería de virtualización (ej. `@tanstack/react-virtual` o `react-window`) para evitar jank en el scroll por exceso de nodos DOM.
- **Source tree components to touch:**
  - `web/src/components/search/SearchResultCard.tsx` (Nueva)
  - `web/src/components/search/SearchResultsList.tsx` (Nueva)

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
