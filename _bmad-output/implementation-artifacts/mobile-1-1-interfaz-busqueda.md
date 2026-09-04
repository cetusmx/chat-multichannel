# Story 1.1: Interfaz Base de Búsqueda Móvil

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a vendedor en campo,
I want acceder a un buscador global desde la barra principal de la app móvil,
so that pueda buscar rápidamente sin tener que navegar por múltiples pantallas.

## Acceptance Criteria

1. **Given** que estoy en cualquier pestaña principal de la app
   **When** toco la barra de búsqueda o el icono 🔍
   **Then** la app navega a la pantalla dedicada de Búsqueda (`SearchScreen`).
2. **Given** que estoy en `SearchScreen` y el input tiene texto válido
   **When** presiono buscar
   **Then** el frontend llama al endpoint `GET /api/search` pasándole el query
   **And** deshabilita temporalmente el envío de nuevas búsquedas hasta que termine la petición.
3. **Given** que el frontend disparó la búsqueda
   **When** la promesa está en curso
   **Then** la pantalla debe renderizar un estado de carga (ActivityIndicator o Skeleton).
4. **Given** que el usuario intentó buscar solo con espacios en blanco o texto vacío
   **When** presiona buscar
   **Then** el frontend debe ignorar la acción y no disparar la llamada al backend.
5. **Given** que la búsqueda terminó pero hubo un error de red o de servidor (500)
   **When** se resuelve la promesa con error
   **Then** la pantalla debe ocultar el estado de carga y mostrar un mensaje amistoso de error con un botón para reintentar.
6. **Given** que la búsqueda terminó correctamente y la API retornó un array vacío
   **When** se resuelve la promesa
   **Then** la pantalla debe mostrar un mensaje "Sin resultados para [query]".
7. **Given** que la búsqueda terminó correctamente y la API retornó resultados
   **When** se resuelve la promesa
   **Then** la pantalla debe renderizar una lista (FlatList) con los resultados.

## Tasks / Subtasks

- [ ] Task 1: Crear la pantalla `SearchScreen` e integrarla al Stack de Navegación (AC: 1)
  - [ ] Añadir icono de búsqueda 🔍 en el Header (o TabBar) para disparar el nav.push('SearchScreen').
  - [ ] Envolver el contenido de la pantalla en `SafeAreaView` para evitar superposición con notches y Dynamic Island.
- [ ] Task 2: Implementar input de búsqueda en `SearchScreen` (AC: 2, 3, 4, 5, 6, 7)
  - [ ] Implementar un patrón de máquina de estados estricta en lugar de booleanos aislados (`status: 'idle' | 'loading' | 'success' | 'empty' | 'error'`).
  - [ ] Manejar el estado local del input (`searchTerm`).
  - [ ] Configurar el TextInput con `returnKeyType='search'` y disparar la búsqueda en `onSubmitEditing`.
  - [ ] Implementar un botón 'X' claro en el input para limpiar el texto ingresado.
  - [ ] Prevenir llamadas a la API si `searchTerm.trim()` está vacío.
  - [ ] Deshabilitar el teclado (Keyboard.dismiss) y el botón al disparar la búsqueda.
  - [ ] Utilizar `AbortController` para la petición al backend; abortar cualquier petición en curso ANTES de disparar una nueva búsqueda, para prevenir race conditions.
  - [ ] Implementar limpieza de estado (resetear searchTerm, results, status) y cancelar la petición (abort) al desmontar el componente (unmount).
- [ ] Task 3: Renderizado de Estados de la UI (AC: 3, 5, 6, 7)
  - [ ] Renderizar el estado de carga (ActivityIndicator) cuando `status === 'loading'`.
  - [ ] Renderizar un componente de fallback visual invitando al usuario a reintentar la búsqueda cuando `status === 'error'`.
  - [ ] Implementar un componente visual de Empty State ("Sin resultados para [query]") cuando `status === 'empty'`, truncando el texto del query usando `numberOfLines={1}` y `ellipsizeMode='tail'`.
  - [ ] Renderizar los resultados en una `FlatList` cuando `status === 'success'`, configurándola con `keyboardShouldPersistTaps='handled'` y `keyboardDismissMode='on-drag'`.
- [ ] Task 4: Accesibilidad (A11y)
  - [ ] Asegurar que todos los botones tengan un touch target mínimo de 44x44px.
  - [ ] Añadir `accessibilityLiveRegion='polite'` en los mensajes de estado (carga, error, vacío) para que sean leídos por screen readers.

## Dev Notes

- **Architecture Constraints:** Al tratarse de React Native (Expo), utilizar `@react-navigation/native` para el enrutamiento. Asegurarse de que el input de búsqueda utilice `autoFocus={true}` al montar la pantalla para agilizar el flujo.
- **Source tree components:**
  - `mobile/src/navigation/MainNavigator.js` (registrar nueva pantalla)
  - `mobile/src/screens/SearchScreen.js` (nueva)
- **API Patterns:** El endpoint `GET /api/search` ya fue desarrollado para la versión web; la app móvil consumirá la misma estructura de respuesta (`data.results` y `data.facets`).
- **Performance:** Optimizar la `FlatList` para arrays grandes utilizando `initialNumToRender`, `maxToRenderPerBatch`, y `windowSize` para prevenir crashes y memory leaks.
- **Edge Cases:** Importante limpiar la memoria caché de la búsqueda si el usuario presiona el botón físico de "Atrás" en Android y vuelve a entrar a la pantalla después.

### Project Structure Notes

- El proyecto móvil se asume ubicado en el directorio `/mobile/`. Mantener coherencia con los patrones de estado y componentes atómicos ya existentes en el repositorio móvil.

### References

- Épica Móvil: `epic-busqueda-movil.md`
- Endpoint: `backend/src/routes/chat.routes.js`

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
