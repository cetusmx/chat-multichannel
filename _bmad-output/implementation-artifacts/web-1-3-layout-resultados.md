# Story US-1.3: Layout de Resultados y Drawer de Filtros

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a usuario de la plataforma web,
I want visualizar los resultados de búsqueda global en un layout de dos columnas (o mediante un Drawer en dispositivos móviles) que me permita aplicar filtros facetados,
so that pueda reducir grandes volúmenes de resultados y encontrar la entidad exacta (chat, cliente, pedido) de forma organizada.

## Acceptance Criteria

1. **Given** que el usuario navega a la página de resultados `/search?q=termino`
   **Then** la página debe renderizar un layout estructurado con un panel lateral izquierdo (Sidebar) para los filtros y una sección principal para la lista de resultados.
2. **Given** el panel de filtros (Sidebar)
   **When** se reciben los datos de facetas desde la API
   **Then** debe mostrar visualmente las categorías disponibles (Chats, Clientes, Pedidos) junto con sus respectivos conteos.
3. **Given** un usuario navegando en un dispositivo móvil o pantalla pequeña
   **Then** el panel lateral (Sidebar) debe ocultarse por defecto y ser reemplazado por un botón "Filtros" que, al presionarse, abra un Drawer (menú deslizable) con las opciones de filtrado.
4. **Given** el panel de filtros (Sidebar o Drawer)
   **When** el usuario selecciona una categoría o filtro
   **Then** la aplicación debe actualizar la URL para reflejar el filtro (ej. `&type=chats`) y desencadenar un refresco de los resultados en la columna principal, manteniendo el término de búsqueda original.
5. **Given** una búsqueda que retorna cero resultados
   **Then** la página debe mostrar un estado vacío claro ("No se encontraron resultados para '[término]'") y el panel de filtros debe deshabilitar sus opciones o mostrar conteos en cero.
6. **Given** un fallo de red o error de servidor (ej. 500)
   **Then** la página debe renderizar un estado de error amigable con un botón para reintentar la búsqueda.
7. **Given** una URL con parámetros de filtro inválidos o desconocidos
   **Then** el frontend debe ignorarlos/limpiarlos de forma segura y ejecutar una búsqueda estándar o válida sin crashear.
8. **Given** que la API está procesando una búsqueda
   **Then** se deben mostrar Skeletons (placeholders) tanto en el panel de filtros como en la lista de resultados para mantener la estructura y prevenir layout shifts; no debe parpadear un estado vacío.
9. **Given** el Drawer de filtros abierto en un dispositivo móvil
   **When** el usuario selecciona un filtro o toca el fondo oscuro (backdrop)
   **Then** el Drawer debe cerrarse automáticamente para revelar los resultados filtrados.
10. **Given** uno o más filtros activos aplicados a la búsqueda
    **Then** la UI debe mostrar en la parte superior (encima de los resultados) un grupo de etiquetas/pills indicando los filtros activos (ej. `[ Tipo: Chats (x) ]`), además de un botón para "Borrar Todos".
11. **Given** que el usuario está en una página paginada (ej. `page=4`)
    **When** aplica o elimina un filtro facetado
    **Then** la paginación debe resetearse automáticamente a `page=1` (u `offset=0`) para evitar consultar páginas que ya no existen.

## Tasks / Subtasks

- [ ] Task 1: Componente de Layout y Estados (`SearchResultsLayout`, Skeletons, `EmptyState`, `ErrorState`) (AC: 1, 5, 6, 8)
  - [ ] Implementar un layout de dos columnas usando CSS Grid o Flexbox.
  - [ ] Aplicar media queries para ocultar el panel izquierdo en resoluciones móviles.
  - [ ] Implementar **Skeleton loaders** para el Sidebar y la columna principal.
  - [ ] Implementar vistas para el estado de "Cero Resultados" y el "Estado de Error".
- [ ] Task 2: Implementación de Filtros y Drawer Mobile (`FiltersSidebar` y `FiltersDrawer`) (AC: 2, 3, 5, 9)
  - [ ] Construir el componente visual para listar las categorías y sus conteos. Deshabilitar botones si el conteo es 0.
  - [ ] Implementar un botón "Filtros" (visible solo en mobile).
  - [ ] Construir el componente `Drawer` con backdrop oscuro de auto-cierre al tap.
  - [ ] **Prevención de Scroll:** Asegurar que el `<body>` reciba `overflow: hidden` cuando el Drawer está abierto.
- [ ] Task 3: Lógica de Sincronización y Sanitización de URL (AC: 4, 7, 10, 11)
  - [ ] Leer los parámetros actuales usando `useSearchParams`.
  - [ ] **Serialización de Arrays:** Estandarizar el formato para selección múltiple utilizando keys repetidas (ej. `?type=chats&type=clientes` nativo de `URLSearchParams`) para evitar mismatches con el backend.
  - [ ] **Sanitización:** Validar parámetros conocidos.
  - [ ] **Filtros Activos (Pills):** Mapear los filtros actuales a una fila de "Pills" por encima de los resultados. Al clickear la `(x)` de un Pill, recalcular los parámetros, actualizar la URL (`push`/`replace`) y remover el filtro.
  - [ ] **Reset de Paginación (Crítico):** Al aplicar o remover cualquier filtro, forzar explícitamente el reseteo del parámetro de paginación (`page=1` u `offset=0`) en la nueva URL generada.
  - [ ] **Aborting Requests:** Implementar `AbortController` (o delegar en React Query/SWR) para cancelar peticiones en vuelo anteriores si los filtros cambian rápidamente, evitando race conditions de datos obsoletos.
  - [ ] Al seleccionar un filtro, hacer push/replace en el router fusionando el nuevo parámetro con los existentes (preservando `q`).
- [ ] Task 4: Accesibilidad del Drawer (A11y)
  - [ ] **Focus Trapping:** Implementar captura de foco (Focus Trap) dentro del Drawer móvil usando librerías (ej. Radix UI, `focus-trap-react`) o el elemento `<dialog>`. 
  - [ ] Aislar el contenido principal con `aria-hidden="true"` mientras el Drawer esté abierto.
  - [ ] **Focus Restoration:** Garantizar que al cerrar el Drawer, el foco regrese automáticamente al botón "Filtros" que lo invocó.

## Dev Notes

- **Architecture Constraints:**
  - El estado de la UI (filtro activo) no debe almacenarse en variables de estado locales separadas de la URL, para permitir que los enlaces sean compartibles.
  - **Optimización de Renders:** Dado que cambiar filtros actualiza la URL y dispara un re-render de alto nivel, considerar usar `React.memo` en tarjetas de resultados y componentes del Sidebar, o usar `startTransition` (React 18) para mantener la UI fluida.
- **Source tree components to touch:**
  - `web/src/pages/SearchPage.tsx`
  - `web/src/components/search/SearchResultsLayout.tsx` (Nueva)
  - `web/src/components/search/FiltersSidebar.tsx` (Nueva)
  - `web/src/components/search/FiltersDrawer.tsx` (Nueva)

### Project Structure Notes

- **Alignment:** Reutilizar componentes base del sistema de diseño (ej. `Drawer` o `Offcanvas` si existen en la librería UI actual).

### References

- Épica Web Global: `epic-busqueda-global.md`
- Endpoint Backend: US-1.1

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
