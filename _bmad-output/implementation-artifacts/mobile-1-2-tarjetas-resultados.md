# Story 1.2: Tarjetas de Resultados Apiladas

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a vendedor en campo,
I want ver los resultados de mi búsqueda presentados en tarjetas apiladas con la información clave del producto (imagen, nombre, SKU, precio y stock),
so that pueda identificar rápidamente el artículo correcto para mi cliente sin tener que abrir el detalle de cada uno.

## Acceptance Criteria

1. **Given** que la búsqueda ha retornado resultados exitosamente
   **When** se muestra la lista en la pantalla de búsqueda
   **Then** cada ítem debe renderizarse como una tarjeta individual apilada verticalmente.
2. **Given** una tarjeta de resultado de producto
   **Then** debe mostrar la imagen miniatura del producto a la izquierda (con un placeholder genérico si la imagen falla o no existe).
   **And** debe mostrar el nombre del producto (truncado a 2 líneas), SKU, precio formateado y el nivel de stock a la derecha.
3. **Given** que la lista de resultados se está mostrando
   **When** el usuario presiona una de las tarjetas
   **Then** la app debe navegar a la pantalla de detalle del producto (`ProductDetailScreen` u homóloga) pasando el identificador del producto.
4. **Given** el diseño visual de la tarjeta
   **Then** debe respetar los tokens de diseño de la aplicación móvil (márgenes, padding, bordes redondeados, colores de texto y sombras ligeras para indicar elevación).
5. **Given** datos de texto ausentes o incompletos (`name`, `SKU`, `price`, `stock` como `null` o `undefined`)
   **Then** la UI debe implementar fallbacks para texto (ej: "Sin nombre", "Sin SKU") para evitar pantallas en blanco o crashes.
6. **Given** un precio de valor `0` o nulo
   **Then** la tarjeta debe mostrar el texto "Consultar precio" en lugar de $0.00 o romper el formateador de moneda.
7. **Given** el nivel de stock de un producto
   **Then** si el stock es `0`, debe mostrar el texto "Agotado" utilizando un color de advertencia (rojo). Si el stock es nulo/indefinido, mostrar "Stock no disponible".
8. **Given** la necesidad de prevenir desbordamiento de la UI por textos largos
   **Then** los elementos de texto de SKU y Precio deben limitar estrictamente su renderizado usando `numberOfLines={1}` y `ellipsizeMode="tail"`.

## Tasks / Subtasks

- [ ] Task 1: Crear el componente presentacional `SearchResultCard` (AC: 1, 2, 4)
  - [ ] Implementar el contenedor principal estrictamente con `Pressable`, configurando `android_ripple` (Android) y cambio de opacidad (iOS).
  - [ ] Añadir props de accesibilidad al `Pressable`: `accessible={true}`, `accessibilityRole="button"`, `accessibilityHint="Toca para ver los detalles del producto"`, y un `accessibilityLabel` combinado con los datos clave del producto.
  - [ ] Ocultar los elementos internos (`Image`, `Text`) de los lectores de pantalla (p. ej. `importantForAccessibility="no-hide-descendants"` / `accessibilityElementsHidden={true}`).
  - [ ] Maquetar la imagen miniatura usando `expo-image` (o `react-native-fast-image`) para cacheo agresivo, con layout a la izquierda e imagen por defecto.
  - [ ] Maquetar la información a la derecha: Nombre (`numberOfLines={2}`), SKU y Precio (`numberOfLines={1}`, `ellipsizeMode="tail"`).
  - [ ] Añadir soporte para escalado de fuentes en textos: `allowFontScaling={true}` y `maxFontSizeMultiplier={1.5}`.
  - [ ] Implementar fallbacks de texto para variables nulas, "Consultar precio" si es 0/nulo, y renderizado condicional de stock (rojo "Agotado" si es 0, oculto si nulo).
  - [ ] Aplicar estilos base (`StyleSheet`):
    - [ ] Definir estrictamente un `lineHeight` explícito en los textos para evitar que Android recorte letras inferiores al truncar (`numberOfLines`).
    - [ ] Implementar sombras cross-platform: `elevation` para Android, y `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` para iOS.
- [ ] Task 2: Integrar el componente en `SearchScreen` (AC: 1, 3)
  - [ ] Actualizar el prop `renderItem` del `FlatList` en `SearchScreen` para renderizar el componente `SearchResultCard`.
  - [ ] Definir el manejador `onPress` en `SearchScreen` utilizando `useCallback` para mantener la estabilidad de la referencia y evitar recrear la función en cada render. Pasar el id del producto a este manejador.
- [ ] Task 3: Optimizaciones de rendimiento (AC: 1)
  - [ ] Envolver `SearchResultCard` en `React.memo` para prevenir re-renderizados (requiere que el `onPress` inyectado sea estable).
  - [ ] Asegurarse de proveer un prop `keyExtractor` óptimo en la `FlatList`.
  - [ ] Agregar props avanzadas a `FlatList`: `removeClippedSubviews={true}`, `initialNumToRender`, `maxToRenderPerBatch`, y `windowSize`.
  - [ ] Implementar `getItemLayout` en `FlatList` (asumiendo altura fija de tarjeta) para evitar cálculos dinámicos y garantizar scrolling suave.

## Dev Notes

- **Architecture Constraints:** El componente `SearchResultCard` debe ser completamente "dumb" (presentacional), recibiendo la data del producto y callbacks (`onPress`) mediante props. Esto facilita su prueba y reutilización en otros contextos (e.g. pantalla de favoritos).
- **Source tree components to touch:**
  - `mobile/src/components/SearchResultCard.js` (o `.tsx` según configuración) - *Nueva*
  - `mobile/src/screens/SearchScreen.js` - *Modificación*
- **Testing standards summary:** Probar que el `SearchResultCard` renderice correctamente cuando faltan datos opcionales (ej. sin imagen) y verificar que `onPress` sea llamado con el parámetro correcto.

### Project Structure Notes

- **Alignment con estructura unificada:** Se ubicará en la carpeta de componentes globales `mobile/src/components/` ya que las tarjetas de producto suelen reutilizarse en la app.

### References

- Épica Móvil: `epic-busqueda-movil.md`
- Historia Base: `_bmad-output/implementation-artifacts/mobile-1-1-interfaz-busqueda.md`

## Dev Agent Record

### Agent Model Used

Antigravity-M16

### Debug Log References

### Completion Notes List

### File List
