# Story 2.2: Tarjeta de Sesión Contigua Colapsada (Acordeón)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a vendedor o supervisor,
I want que los mensajes coincidentes de una misma sesión de chat se agrupen en una sola tarjeta colapsable (acordeón),
so that la lista de resultados no se sature con múltiples coincidencias seguidas del mismo chat y pueda navegar los resultados más eficientemente.

## Acceptance Criteria

1. **Given** que la API de búsqueda retorna resultados
   **When** el frontend procesa los datos
   **Then** debe agrupar los resultados consecutivos del mismo `chatId` en un Acordeón **solo si** hay 2 o más coincidencias continuas. Resultados únicos y aislados deben renderizarse como tarjetas normales sin contenedor.
2. **Given** un componente de grupo de resultados (Acordeón) en estado cerrado
   **Then** la cabecera debe mostrar información de contexto (nombre del cliente/chat, fecha de la sesión) y el número de coincidencias contenidas (ej. "3 coincidencias"). Si faltan metadatos, mostrar fallbacks ("Cliente desconocido", "Fecha no disponible").
3. **Given** un acordeón cerrado
   **When** el usuario presiona la cabecera
   **Then** el componente debe expandirse animadamente para revelar las tarjetas de resultados individuales de los mensajes coincidentes.
4. **Given** un acordeón expandido
   **When** el usuario presiona uno de los resultados internos
   **Then** la app debe navegar al mensaje específico en el visor (igual que en un resultado no agrupado).
5. **Given** un escenario de carga paginada
   **When** la siguiente página de resultados es recibida y añadida al estado
   **Then** el algoritmo de agrupación debe verificar el último elemento de la página anterior y el primer elemento de la nueva página. Si comparten el mismo `chatId`, deben ser fusionados en el mismo acordeón.
6. **Given** múltiples acordeones en la lista de resultados
   **When** el usuario expande uno de ellos
   **Then** los demás acordeones mantienen su estado actual (comportamiento independiente, abrir uno no cierra los otros).

## Tasks / Subtasks

- [ ] Task 1: Agrupación de Resultados (Capa de Lógica) (AC: 1, 5)
  - [ ] Implementar un selector, hook o utilidad (`groupResults`) que procese el array plano.
  - [ ] Implementar manejo seguro para arreglos vacíos o nulos sin arrojar errores.
  - [ ] Asegurar que la lógica requiera un mínimo de 2 resultados contiguos para formar un grupo.
  - [ ] Añadir lógica para manejar paginación (fusionar el nuevo grupo inicial con el último grupo previo si comparten `chatId`).
- [ ] Task 2: Crear el Componente `SearchResultAccordion` (AC: 2, 3, 6)
  - [ ] Maquetar la cabecera del acordeón implementando fallbacks para datos nulos y garantizando un área táctil óptima (min-height 48dp y configuración de `hitSlop`).
  - [ ] Añadir un ícono de flecha (chevron) implementando su rotación (0deg a 180deg) estrictamente mediante `useAnimatedStyle` de Reanimated para asegurar 60fps en el UI thread.
  - [ ] Implementar la expansión/contracción del contenido utilizando Layout Animations de Reanimated (ej. `Layout.duration(300).easing(Easing.inOut(Easing.ease))`) para empujar fluidamente los demás elementos de la lista sin saltos bruscos.
  - [ ] Configurar el estado local `isExpanded` de forma independiente para cada instancia del acordeón.
- [ ] Task 3: Integración en la Interfaz de Búsqueda (AC: 1, 4)
  - [ ] Actualizar el `renderItem` de la `FlatList` en `ChatHistorySearchScreen` para renderizar `SearchResultAccordion` si es un grupo, o la tarjeta normal si es un ítem único.
  - [ ] Enlazar el evento `onPress` de las tarjetas hijas a la lógica de navegación (Story 2.1).
- [ ] Task 4: Accesibilidad (A11y)
  - [ ] **Semántica y Estado:** Asignar a la cabecera del acordeón `accessibilityRole="button"` y actualizar dinámicamente `accessibilityState={{ expanded: isExpanded }}`.
  - [ ] **Labels y Hints Contextuales:** Proveer un `accessibilityLabel` combinando el resumen (ej. "Chat con Juan, 3 coincidencias") y un `accessibilityHint` dinámico ("Toca para expandir..." o "Toca para contraer...").
  - [ ] **Contenido Oculto:** Asegurar que cuando el acordeón esté cerrado, el contenido hijo no se lea por VoiceOver/TalkBack (desmontar los hijos o usar propiedades como `importantForAccessibility="no-hide-descendants"` / `accessibilityElementsHidden={true}`).

- [ ] Task 5: Rendimiento y Picos de Memoria
  - [ ] **Límite de Resultados Internos:** Para no romper la virtualización de la `FlatList` con acordeones masivos, limitar el mapeo interno a un máximo de 5-10 tarjetas hijas. Si hay más coincidencias, renderizar un botón "Ver X más en el chat" que navegue al visor.
  - [ ] **Optimización de Agrupación:** Envolver la llamada a `groupResults` con `useMemo`. Al paginar, optimizar el algoritmo para anexar y fusionar los nuevos datos con el último grupo existente en lugar de recalcular todo el array desde cero.
  - [ ] **Memoización de UI:** Envolver `SearchResultAccordion` en `React.memo` (y manejar su `isExpanded` en estado local estricto) para que expandir un grupo no provoque un re-render global de la lista o de los otros acordeones.

## Dev Notes

- **Architecture Constraints:**
  - El proceso de agrupación debe ser lo más liviano posible para no bloquear el hilo JS.
- **Source tree components to touch:**
  - `mobile/src/components/SearchResultAccordion.js` (Nueva)
  - `mobile/src/screens/ChatHistorySearchScreen.js`
  - `mobile/src/utils/groupingUtils.js`

### Project Structure Notes

- **Alignment:** Utilizar la librería de iconos existente (ej. `@expo/vector-icons`) para los chevrons, y adherirse a los tokens de diseño (espaciados y colores).

### References

- Épica Móvil: `epic-busqueda-movil.md`
- Historia Precedente: Story 2.1 (Navegación Visor)

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
