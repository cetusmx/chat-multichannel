# Story 2.3: Expansión In-Place de Sesión Contigua

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a vendedor o supervisor,
I want ver tarjetas de "sesiones contiguas" al llegar al límite del historial de un chat, y poder tocarlas para expandir los mensajes en la misma pantalla,
so that pueda leer el historial de conversaciones anteriores o posteriores con el mismo cliente de forma fluida sin tener que volver atrás y buscar otras sesiones.

## Acceptance Criteria

1. **Given** que estoy en el visor de chat (`ChatViewerScreen`) y he hecho scroll hasta el límite superior o inferior de los mensajes locales
   **When** el backend indica que existen más sesiones pasadas o futuras con el mismo cliente
   **Then** se debe renderizar un componente (Tarjeta de Sesión Contigua) indicando la disponibilidad de otra conversación (ej. "Ver sesión anterior del 12/Mar").
2. **Given** la tarjeta de sesión contigua
   **When** el usuario la presiona
   **Then** la aplicación debe hacer fetch para obtener los mensajes de esa sesión y anexarlos in-place. Si el usuario intenta presionar múltiples veces, la acción debe ser ignorada si ya está cargando.
3. **Given** que se ha iniciado la carga
   **Then** la tarjeta debe transformarse en un estado de carga (ActivityIndicator) mientras la red responde. Si la petición falla, debe mostrar un estado de error/reintento ("Error al cargar. Toca para reintentar").
4. **Given** que los mensajes fueron anexados exitosamente
   **Then** la tarjeta de sesión desaparece y, si no existen más sesiones pasadas o futuras absolutas, no debe renderizarse ninguna tarjeta nueva.
5. **Given** que la sesión cargada no contiene mensajes renderizables
   **Then** el sistema debe automáticamente remover la tarjeta o hacer fetch de la siguiente sesión para no dejar al usuario atascado.

## Tasks / Subtasks

- [ ] Task 1: Crear el componente `ContiguousSessionCard` (AC: 1, 3)
  - [ ] Diseñar el componente presentacional para indicar visualmente "Tocar para cargar sesión anterior/siguiente".
  - [ ] Implementar el estado `isLoading` mostrando un spinner y aplicando `disabled={true}` al `Pressable` para prevenir *spam taps*.
  - [ ] Añadir soporte de Accesibilidad base: configurar `accessibilityRole="button"`, y vincular el estado de carga usando `accessibilityState={{ busy: isLoading, disabled: isLoading }}`.
  - [ ] Implementar un estado `isError` que cambie el texto a un formato de reintento en caso de fallo de red.
- [ ] Task 2: Modificar `ChatViewerScreen` y Estado de Mensajes (AC: 1, 2, 4, 5)
  - [ ] Actualizar el store local para almacenar las sesiones limítrofes (`previousSessionId`, `nextSessionId`).
  - [ ] Renderizar el `ContiguousSessionCard` solo si `previousSessionId` o `nextSessionId` no son nulos (no renderizar si llegamos al inicio o final absoluto del historial).
  - [ ] **Mapeo Invertido:** Colocar la tarjeta de "Cargar sesión anterior" (mensajes más viejos) en el `ListFooterComponent` (que físicamente es la parte SUPERIOR en una lista invertida) y la tarjeta de "Cargar sesión siguiente" (más recientes) en el `ListHeaderComponent` (parte INFERIOR).
  - [ ] **Estabilidad de Scroll:** Implementar el prop `maintainVisibleContentPosition` en la `FlatList` (iOS) utilizando un polyfill robusto para Android (ej. `@stream-io/flat-list-mvcp`) para evitar saltos violentos al anexar mensajes en la parte superior.
  - [ ] Implementar el handler `onLoadSession`, uniendo el array resultante (`concat` o spread) al inicio o final de los mensajes locales.
  - [ ] Manejar el *edge case* de sesiones vacías: si la sesión retornada tiene longitud 0, remover automáticamente la tarjeta o seguir buscando la siguiente sesión con datos.
- [ ] Task 3: Accesibilidad (A11y)
  - [ ] **Anuncios de Estado:** Utilizar `AccessibilityInfo.announceForAccessibility()` para anunciar "Cargando sesión..." al presionar la tarjeta, y "Error al cargar" si la petición falla.
  - [ ] **Manejo de Foco Post-Carga:** Una vez que los mensajes nuevos son renderizados, usar `AccessibilityInfo.setAccessibilityFocus(ref)` para mover el foco programáticamente al primer mensaje recién cargado, evitando que el lector de pantallas se pierda al desaparecer el botón.
- [ ] Task 4: Rendimiento y Prevención de OOM (Out-Of-Memory)
  - [ ] **Estrategia de Ventana (Pruning):** Implementar un límite máximo seguro en el array local (ej. 400-500 mensajes). Si anexar una sesión supera el límite, descartar (trim) mensajes del extremo opuesto y renderizar allí una tarjeta `ContiguousSessionCard` para permitir el retorno, garantizando así un uso de memoria estrictamente limitado.
  - [ ] **Composite `keyExtractor`:** Para evitar colisiones catastróficas al mezclar sesiones, usar obligatoriamente una clave compuesta globalmente única en la `FlatList` (ej. `keyExtractor={(item) => \`\${item.sessionId}-\${item.messageId}\`}`).
  - [ ] **Batching de Estado:** Asegurar que la actualización del array de mensajes y el cambio de `isLoading` a `false` ocurran en una misma acción del reducer o bloque batcheado para evitar dobles renderizados costosos de la lista.

## Dev Notes

- **Architecture Constraints:** 
  - Al anexar mensajes, es crítico mantener la posición del scroll anclada. El uso estricto de `maintainVisibleContentPosition` / polyfills es obligatorio.
  - Se recomienda envolver los mensajes recién cargados en un contenedor de Reanimated con `entering={FadeIn}` o animaciones `Layout` para suavizar la inserción en la UI y evitar apariciones bruscas.
  - El límite estricto de memoria (Task 4) debe manejarse de preferencia en la capa de datos (Context/Redux/Zustand) y no en el render.
- **Source tree components to touch:**
  - `mobile/src/components/ContiguousSessionCard.js` (Nueva)
  - `mobile/src/screens/ChatViewerScreen.js`

### Project Structure Notes

- **Alignment:** Respetar los estilos tipográficos de la aplicación para metadatos de fechas.

### References

- Épica Móvil: `epic-busqueda-movil.md`

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
