# Story 1.3: Filtros Dinámicos en Bottom Sheet

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a supervisor o vendedor,
I want abrir un panel de filtros desde la parte inferior (Bottom Sheet) para refinar mi búsqueda del historial de chats,
so that pueda encontrar conversaciones específicas por vendedor, estado o fecha sin que estos controles ocupen espacio permanente en la pantalla.

## Acceptance Criteria

1. **Given** que estoy en la pantalla de historial/búsqueda de chats
   **When** presiono el botón de "Filtros"
   **Then** se despliega de forma animada un Bottom Sheet desde la parte inferior de la pantalla.
2. **Given** el panel de filtros abierto
   **Then** debo ver las siguientes secciones: un selector de Vendedor, opciones de Estado (ej: Abierto, Pendiente, Cerrado) y selección de Rango de Fechas.
3. **Given** que he interactuado con las opciones de filtro
   **When** presiono el botón "Aplicar"
   **Then** el Bottom Sheet se cierra y la lista de historial de chats se actualiza utilizando los parámetros seleccionados.
4. **Given** que tengo uno o más filtros activos
   **When** abro el Bottom Sheet y presiono "Limpiar Filtros"
   **Then** las selecciones se resetean, el Bottom Sheet se cierra inmediatamente y la lista de chats se actualiza sin filtros de forma automática.
5. **Given** el selector de Rango de Fechas
   **When** el usuario selecciona las fechas
   **Then** el sistema debe validar que la Fecha de Fin no sea anterior a la Fecha de Inicio.
6. **Given** que el usuario modifica los filtros (draft state)
   **When** cierra el Bottom Sheet sin presionar "Aplicar" (haciendo swipe hacia abajo o tocando el backdrop oscuro)
   **Then** el panel se cierra, los cambios en el draft se descartan y al reabrir el panel se muestran los últimos filtros aplicados.

## Tasks / Subtasks

- [ ] Task 1: Configurar e implementar la base del Bottom Sheet (AC: 1, 6)
  - [ ] Integrar `@gorhom/bottom-sheet` configurando un componente de backdrop interactivo (`BottomSheetBackdrop`) que cierre el panel al tocarlo.
  - [ ] Configurar explícitamente los `snapPoints` (ej. `['50%', '90%']` o tamaño dinámico adaptativo) para un despliegue sin jank.
  - [ ] Configurar el Bottom Sheet para evadir el teclado nativo (Keyboard Avoidance) si se despliegan calendarios o inputs de texto.
  - [ ] Añadir un botón de "Filtros" en la cabecera o barra de búsqueda de la pantalla de historial.
- [ ] Task 2: Maquetar los controles de filtrado (AC: 2, 5)
  - [ ] Envolver el contenido del formulario utilizando estrictamente los componentes scrollables nativos de la librería (ej. `BottomSheetScrollView` o `BottomSheetFlatList`) para prevenir conflictos entre el scroll vertical y el gesto swipe-to-dismiss.
  - [ ] Implementar un selector/dropdown para Vendedor, añadiendo estados de carga y UI de fallback si la API falla o está vacía ("Error al cargar" / "Sin vendedores").
  - [ ] Implementar selectores (Chips o Checkboxes) para los Estados del chat.
  - [ ] Implementar selector de Rango de Fechas con validación para prevenir que la Fecha de Fin sea menor a la de Inicio.
- [ ] Task 3: Implementar la lógica y estado de los filtros (AC: 3, 4, 6)
  - [ ] Manejar un estado local (draft) de los filtros mientras el panel está abierto.
  - [ ] Sincronizar el estado draft con el estado global al presionar "Aplicar" y disparar la búsqueda.
  - [ ] Interceptar el evento de cierre del Bottom Sheet (onDismiss) para resetear el estado draft al estado global si el usuario no aplicó los cambios.
  - [ ] Implementar el botón "Limpiar Filtros" para que de forma inmediata resetee el estado global, cierre el panel y refresque la búsqueda.
- [ ] Task 4: Accesibilidad (A11y) (AC: 1, 2, 6)
  - [ ] **Background Focus Trapping:** Configurar el Bottom Sheet con `accessibilityViewIsModal={true}` (y/o ocultar el contenedor fondo con `importantForAccessibility="no-hide-descendants"`) para evitar que los lectores de pantalla lean la pantalla principal oculta.
  - [ ] **Backdrop:** Asignar al `BottomSheetBackdrop` un `accessibilityRole="button"` y `accessibilityLabel="Cerrar panel de filtros"`.
  - [ ] **Botón Trigger:** Añadir `accessibilityHint="Abre el panel de filtros de búsqueda"` al botón "Filtros" en la cabecera.
  - [ ] **Controles de Filtro:** 
    - [ ] Asegurar que los Chips/Checkboxes usen `accessibilityRole="checkbox"` o `"button"` y reflejen el estado mediante `accessibilityState={{ checked: true/false }}`.
    - [ ] Proveer `accessibilityLabel` y `accessibilityHint` descriptivos para los selectores de Fecha y Vendedores, indicando su valor actual.

- [ ] Task 5: Rendimiento y Prevención de Fugas de Memoria
  - [ ] **Estrategia de Montaje:** Mantener el `BottomSheet` siempre en el árbol de componentes (no usar `{isOpen && <BottomSheet />}`) y controlar su visibilidad de forma imperativa mediante `ref.current?.expand()` / `close()` o `BottomSheetModal`.
  - [ ] **Prevención de Re-renderizados:** Asegurar que la `FlatList` principal del historial de chats esté memoizada (`React.memo`) para que no se re-renderice en cada frame de la animación del Bottom Sheet (evitar atar su render a `SharedValues` de Reanimated).
  - [ ] **Frame Drops (Animación Fluida):** Diferir el trabajo pesado al presionar "Aplicar" (ej. dispatch a Redux, llamadas de red) hasta **después** de que la animación de cierre haya terminado utilizando `InteractionManager.runAfterInteractions` o callbacks nativos de la librería.
  - [ ] **Cleanup (Memory Leaks):** En el `useEffect` de limpieza de la pantalla `ChatHistoryScreen`, limpiar cualquier timeout activo, abortar peticiones de red si aplica, y resetear drafts si el componente se desmonta mientras el sheet está abierto.

## Dev Notes

- **Architecture Constraints:** 
  - Utilizar el manejador de estado global correspondiente (Context, Redux, Zustand) para que la pantalla de búsqueda principal reaccione tras aplicar los filtros.
  - Es crítico separar el estado de la animación (Reanimated) del estado de UI de React para evitar *render thrashing*.
- **Source tree components to touch:**
  - `mobile/src/components/ChatFiltersBottomSheet.js` (Nueva)
  - `mobile/src/screens/ChatHistoryScreen.js` (Modificar)

### Project Structure Notes

- **Alignment:** Mantener consistencia visual y de animaciones con el resto de modales en el ecosistema móvil.

### References

- Épica Móvil: `epic-busqueda-movil.md`

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
