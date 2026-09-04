# Story US-1.2: Buscador Global Navbar y Refactor de Historial

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a usuario de la plataforma web,
I want tener una barra de búsqueda global en el header principal y un historial de búsquedas recientes,
so that pueda iniciar una búsqueda de clientes, chats o pedidos desde cualquier vista sin perder el contexto, y acceder rápidamente a mis búsquedas anteriores.

## Acceptance Criteria

1. **Given** que el usuario está autenticado en la aplicación web
   **Then** debe visualizar un campo de búsqueda global unificado en la barra de navegación superior (Navbar).
2. **Given** el campo de búsqueda global
   **When** el usuario hace click (focus) en el campo vacío
   **Then** se debe desplegar un panel flotante mostrando el historial de búsquedas recientes del usuario.
3. **Given** el usuario escribiendo en el campo de búsqueda
   **When** presiona "Enter" o el icono de búsqueda con un término válido (no vacío ni puro espacio)
   **Then** el término debe añadirse al historial, y la aplicación debe navegar a la ruta de resultados (`/search?q=termino`), limpiando y descartando cualquier filtro o faceta previa si ya estaba en la página de resultados.
4. **Given** el panel de historial desplegado
   **When** el usuario interactúa con un elemento de la lista
   **Then** hacer click en el texto debe ejecutar la búsqueda; hacer click en el icono "X" (eliminar) debe remover ese término específico del historial.
5. **Given** un intento de búsqueda con input vacío o de solo espacios en blanco
   **Then** el sistema debe ignorar la acción (no navegar ni guardar en historial).

## Tasks / Subtasks

- [ ] Task 1: Refactor del Estado (Historial Persistente) (AC: 4)
  - [ ] Crear o actualizar un store global (Redux, Zustand, o Context) para manejar el array de `recentSearches`. *Nota:* Este store es solo para el historial, no para la query actual.
  - [ ] Implementar la adición de un término. **Crítico:** La desduplicación debe ser *case-insensitive*. Si existe, moverlo al principio.
  - [ ] **Límite de Capacidad:** Limitar el historial a un máximo estricto (ej. 10 elementos). Si se supera, eliminar el más antiguo (FIFO).
  - [ ] Implementar funciones para eliminar un término específico y limpiar todo el historial.
  - [ ] Sincronizar el estado con `localStorage` (o backend) para que el historial persista entre sesiones.
- [ ] Task 2: Implementación de `GlobalSearchInput` y Routing (AC: 1, 3, 5)
  - [ ] Crear el componente visual del input en el `Navbar`.
  - [ ] **Sincronización Inicial:** Al montar el componente, leer los parámetros de la URL (ej. `useSearchParams`) y popular automáticamente el input si existe una query activa.
  - [ ] **Responsividad (Mobile):** Implementar un diseño responsivo. En desktop, mostrar el input completo; en mobile, mostrar un icono de lupa que al presionarse expanda un overlay de búsqueda a todo el ancho.
  - [ ] **Clear Button:** Añadir un botón "X" dentro del input (visible solo si hay texto) que al clickear limpie el estado local y devuelva el foco al input.
  - [ ] **Form Handling (Crítico):** Envolver el input en una etiqueta `<form>` para soportar teclados móviles. Interceptar `onSubmit`, llamar a `e.preventDefault()` para evitar recargas de página, validar que el input (`.trim()`) no esté vacío, y luego navegar. Queda estrictamente prohibido el auto-search o live-search por tipeo en este componente.
  - [ ] **Crítico de Routing:** Utilizar obligatoriamente `encodeURIComponent(termino)` al construir la URL para evitar que caracteres como `+`, `%` o `&` rompan el querystring.
  - [ ] Asegurar que al lanzar una nueva búsqueda desde la barra global, el router navegue de forma limpia a `/search?q=termino`, descartando cualquier otro parámetro de query (`type`, `date`) previo.
- [ ] Task 3: Implementación de `SearchHistoryDropdown` (AC: 2, 4)
  - [ ] Diseñar el menú desplegable posicionado absolutamente debajo del input.
  - [ ] Mapear los elementos del historial, añadiendo botones semánticos para buscar y para borrar.
  - [ ] **Race Condition de Foco:** Para evitar que el `onBlur` del input desmonte el dropdown *antes* de que se dispare el `onClick` del historial, utilizar el evento `onMouseDown` en los elementos de la lista (que se dispara antes del blur), o delegar la gestión del foco a una librería robusta (como Radix UI Popover o MUI Autocomplete).
- [ ] Task 4: Accesibilidad (A11y)
  - [ ] **Landmarks:** Asignar `role="search"` a la etiqueta `<form>` envolvente.
  - [ ] **Input A11y:** Añadir `aria-label="Buscar en toda la aplicación"` al campo de texto.
  - [ ] **Estado del Popover:** Sincronizar el input con el dropdown utilizando `aria-expanded={isOpen}` y `aria-controls="history-dropdown-id"` para que los lectores de pantalla entiendan la relación jerárquica.

## Dev Notes

- **Architecture Constraints:** 
  - **URL como Fuente de Verdad:** La query de búsqueda activa debe derivarse siempre de los parámetros de la URL (ej. `useSearchParams`). No guardar la query activa en un store global para evitar bugs con los botones "Back/Forward" del navegador.
  - Al navegar a la página de resultados, no desmontar el Navbar, ya que el estado visual del input debe mantenerse sincronizado con la URL.
- **Source tree components to touch:**
  - `web/src/components/layout/Navbar.tsx`
  - `web/src/components/search/GlobalSearchInput.tsx` (Nueva)
  - `web/src/components/search/SearchHistoryDropdown.tsx` (Nueva)
  - `web/src/store/searchStore.ts` (Modificar/Nueva)

### Project Structure Notes

- **Alignment:** Utilizar la librería de componentes UI existente (ej. MUI, Tailwind UI, Radix) para el Popover o Dropdown para garantizar la accesibilidad y el z-index correcto.

### References

- Épica Web Global: `epic-busqueda-global.md`

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
