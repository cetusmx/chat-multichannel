---
baseline_commit: 170b2eb5c2de4d27b32df98b50207bb54bfce644
---
# Story 1.4: Interfaz de Acciones de Chat (Frontend UI)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Vendedor,
I want una barra de acciones intuitiva en mi ventana de chat,
so that poder clasificar y pausar mis conversaciones fácilmente.

## Acceptance Criteria

1. Implement new flex layout for ChatHeader, keeping existing Resolver/Escalar components untouched.
2. Agregar botón "Esperando al Cliente" (WAITING_CUSTOMER). Debe estar habilitado ÚNICAMENTE si el último mensaje lo mandó un `VENDOR`.
3. Agregar botón "Poner en Espera" (ON_HOLD). Al hacer clic, abre un Modal pidiendo "Razón" (Opciones: "Esperando proveedor logístico", "Falla técnica / Soporte", "Validación de pago", "Esperando aprobación interna"), "Nota Explicativa" (área de texto requerida) y "Horas límite" antes de ejecutar la acción. La validación del modal debe asegurar que `timebombHours` sea un entero positivo > 0 y <= 168 (máximo 7 días), usando `<input type="number" step="1">` y la validación del esquema frontend debe rechazar explícitamente flotantes/decimales, y la nota explicativa no esté vacía. Se debe limpiar explícitamente el estado del formulario cada vez que el modal se cierra o se envía.
4. Agregar botón "Descartar / Spam" (DISCARDED) de color rojo para matar chats inválidos. Requiere exactamente un modal de confirmación estándar para evitar acciones destructivas accidentales. El modal debe tener exactamente los siguientes textos: Título: "Descartar Conversación", Cuerpo: "¿Estás seguro de marcar este chat como spam? Esto no afectará tus métricas.", Confirmar: "Descartar", Cancelar: "Cancelar". Si se muestra como botón individual usar `<Button variant="destructive">`, pero si la acción está dentro del menú desplegable, utilizar estilos nativos de elemento de menú desplegable (ej. `text-red-600`) en lugar del componente global.
5. Agregar botón o acción para "Programado" (SCHEDULED) estado futuro. Debe estar habilitado ÚNICAMENTE si el último mensaje lo mandó un `VENDOR`. Debe abrir un modal pidiendo fecha y hora, con validación estricta: límite mínimo de 15 minutos en el futuro y máximo de 30 días en adelante. Se debe limpiar explícitamente el estado del formulario al cerrar o enviar el modal.
6. Habilitar acción de "Reanudar" (Resume): Si el chat está en estado `ON_HOLD`, `WAITING_CUSTOMER` o `SCHEDULED`, el vendedor debe ver un botón "Reanudar" para pasarlo a `ACTIVE`. Los demás botones de pausa deben ocultarse en estos estados.
7. Experiencia de usuario (UI/UX):
   - Agrupar las acciones secundarias (`ON_HOLD`, `SCHEDULED`, `DISCARDED`) dentro de un menú desplegable (Dropdown / Kebab menu "Más acciones") para prevenir el desbordamiento horizontal (overflow) en el header del chat. Restricción: Si todas las acciones dentro del desplegable están ocultas, el botón del menú desplegable en sí NO DEBE renderizarse (ver regla `isSlaEnabled`). Si un componente de Dropdown/Menu no existe en `ui/`, el desarrollador debe implementar un dropdown simple nativo basado en Tailwind CSS, SIN instalar nuevos paquetes NPM. Este dropdown menu DEBE usar posicionamiento `absolute`, un alto `z-index` (ej. `z-50`), explícitamente se requiere agregar `relative` al contenedor padre del menú para que el posicionamiento no rompa el flujo (recuerda verificar colisiones de `z-index` entre el dropdown personalizado y el contenedor `MessageList`), y OBLIGATORIAMENTE incluir atributos ARIA adecuados (`aria-expanded`, `aria-haspopup`, `role="menu"`) y accesibilidad por teclado (añadir `role="menuitem"` a los botones de acción internos). Deberá incluir `useRef` para detección de clics fuera del elemento (adjuntando el listener a la fase `mousedown` o `pointerdown` del documento en lugar de `click`), un `useEffect` para cerrar el dropdown al presionar Escape (el `useEffect` DEBE retornar una función de limpieza para remover explícitamente los event listeners del documento y prevenir memory leaks), y el menú DEBE cerrarse inmediatamente al seleccionar una acción.
   - Iconos: Revisar `package.json` para verificar cuál librería de iconos (Lucide o Heroicons) está instalada antes de escribir los imports. Utilizar nombres exactos (ej. `Clock` para WAITING_CUSTOMER, `Calendar` para SCHEDULED, `Ban` para DISCARDED). Especificar explícitamente `MoreVertical` o `EllipsisVertical` para el ícono del menú Kebab desplegable.
   - Se deben incluir tooltips que expliquen el motivo cuando un botón esté deshabilitado (ej. "El último mensaje debe ser tuyo"). Si el chat tiene 0 mensajes (Empty State), los botones de la UI permitidos por el estado actual deben estar visibles pero deshabilitados y mostrar un tooltip específico como "Aún no hay mensajes" (las reglas de visibilidad de la Matriz de Estados toman precedencia absoluta sobre la regla de 0 mensajes). A los botones deshabilitados se les debe añadir `aria-disabled="true"` y una clase `opacity-50` para proveer feedback visual claro.
   - Mientras haya una petición `PATCH` en curso, TODOS los botones de acción en el header deben deshabilitarse simultáneamente y mostrar un indicador de carga (spinner) para prevenir múltiples clics.
8. **Regla de Autoridad `isSlaEnabled`**: Optimizar la lógica de `isSlaEnabled` creando un origen de verdad único (single source-of-truth boolean check, ej: `const isSlaEnabled = tenant?.isSlaEnabled ?? true;`) temprano en el árbol de renderizado para aplicar estas reglas consolidadas:
   - Si `isSlaEnabled` es `false` en el Tenant, ocultar botones avanzados (`WAITING_CUSTOMER`, `ON_HOLD`, `SCHEDULED`, y `DISCARDED`) (y el menú desplegable si queda vacío) y mostrar SOLO "Resolver" y "Escalar". Ocultar condicionalmente los cronómetros visuales de SLA (el agente de desarrollo debe buscar activamente componentes de tipo cronómetro/timer en el árbol de componentes del Header antes de ocultarlos).
   - **Excepción de Pausa**: Si el chat está en `ON_HOLD`, `WAITING_CUSTOMER`, o `SCHEDULED`, el botón "Reanudar" DEBE SEGUIR VISIBLE independientemente de `isSlaEnabled`.
   - **Restricción de Asignación**: Todas las acciones del vendedor deben ser visibles ÚNICAMENTE si el vendedor actual es el asignado al chat (`currentUser.id === chat.assignedVendorId`). IMPORTANTE: El badge "Escalado" es un indicador, no una acción, y DEBE permanecer visible globalmente incluso si `currentUser.id !== chat.assignedVendorId`.
9. Los botones de acción deben regirse estrictamente por la siguiente Matriz de Estados:

| Estado Actual | Acciones Disponibles | Acciones Ocultas/Deshabilitadas |
| :--- | :--- | :--- |
| **`ACTIVE`** | **Resolver**, **Escalar**, **WAITING_CUSTOMER** (*), **ON_HOLD**, **SCHEDULED** (*), **DISCARDED** | Reanudar |
| **`WAITING_CUSTOMER`** | **Reanudar** | Resolver, Escalar, WAITING_CUSTOMER, ON_HOLD, SCHEDULED, DISCARDED |
| **`ON_HOLD`** | **Reanudar** | Resolver, Escalar, WAITING_CUSTOMER, ON_HOLD, SCHEDULED, DISCARDED |
| **`SCHEDULED`** | **Reanudar** | Resolver, Escalar, WAITING_CUSTOMER, ON_HOLD, SCHEDULED, DISCARDED |
| **`CLOSED`** / **`CLOSED_INACTIVE`** | Ninguna | Todas |
| **`DISCARDED`** | Ninguna | Todas |
| **`ESCALATED`** | **Mostrar badge "Escalado - Esperando al Coordinador"** (este badge debe reemplazar completamente los botones de acción en el header para prevenir saltos de diseño/layout shifts) | Todas |
| **`PENDING_ASSIGNMENT`** | Ninguna | Todas |
*\* Habilitado sólo si el último mensaje es del VENDOR. Tooltip explicativo si está deshabilitado.*

## Tasks / Subtasks

- [ ] Task 1: Implement new flex layout for ChatHeader y Matriz de Estados (AC: 1, 6, 8, 9)
  - [ ] Localizar el header del chat (probablemente en FocusPanel o MessageList) en `frontend/src/features/chat/components/`.
  - [ ] Implementar el nuevo layout base preservando las acciones originales ("Resolver" y "Escalar"). Se deben extraer y reutilizar estrictamente los manejadores `onClick` y la lógica de llamadas a la API existentes para los botones "Resolver" y "Escalar" sin modificar sus payloads o comportamientos subyacentes.
  - [ ] Implementar botón "Reanudar" visible SOLO cuando el chat está en `ON_HOLD`, `WAITING_CUSTOMER` o `SCHEDULED` para volver a `ACTIVE` (payload: `{ status: 'ACTIVE' }`).
  - [ ] Ajustar visibilidad y habilitación de botones de acuerdo estricto a la Matriz de Estados.
  - [ ] Añadir renderizado condicional respetando estrictamente la **Regla de Autoridad `isSlaEnabled`** (ver AC 8).
- [ ] Task 2: Implementar botones de estado avanzado con reglas y UI/UX (AC: 2, 4, 7)
  - [ ] Crear botones para `WAITING_CUSTOMER` (payload: `{ status: 'WAITING_CUSTOMER' }`) y `DISCARDED` (payload: `{ status: 'DISCARDED' }`, usar `<Button variant="destructive">`).
  - [ ] Lógica de bloqueo: Agrupar la validación del último mensaje en un bloque de instrucción claro (ej. `const isVendorLast = chat?.messages?.at(-1)?.sender === 'VENDOR'`). Habilitar `WAITING_CUSTOMER` y `SCHEDULED` ÚNICAMENTE si `isVendorLast` es verdadero.
  - [ ] Añadir tooltips explicativos (ej. "El último mensaje debe ser tuyo") en botones deshabilitados.
  - [ ] Implementar estado de carga (loading spinner) y deshabilitar TODOS los botones de acción del header simultáneamente durante peticiones `PATCH`.
- [ ] Task 3: Implementar Modales Consolidados para "Poner en Espera" (ON_HOLD) y "Programado" (SCHEDULED) (AC: 3, 5)
  - [ ] **CRITICAL**: Modals MUST be hoisted to the root of the header component (OUTSIDE the dropdown DOM tree) to prevent them from unmounting when the dropdown closes. Require the dev agent to use React Portals (`createPortal(..., document.body)`) for the modals to guarantee they escape the header's CSS boundary and avoid clipping or DOM trapping.
  - [ ] **State Management**: Usar un único estado `activeModal` (ej. `'HOLD' | 'SCHEDULED' | 'DISCARD' | null`) en lugar de múltiples booleanos independientes.
  - [ ] **Reglas Globales de Modales**: Reutilizar componentes en `frontend/src/components/ui/`. Asegurar `e.preventDefault()` en `onSubmit`. **Smart Defaults**: inicializar `timebombHours` en `24` y `scheduledAt` en exactamente 24 horas en el futuro. **Loading State**: Deshabilitar explícitamente el botón de submit *dentro* del modal durante la petición PATCH. **Form Validation Lifecycle**: Mantener el modal abierto y preservar los datos si la validación frontend falla. **Form Reset**: Limpiar el estado del formulario SOLO después de que la animación de salida del modal termine o asegurando que el modal se desmonte completamente al cerrarse para evitar un flash visual.
  - [ ] **Reglas ON_HOLD**: Pedir "Razón" usando un elemento `<select>` nativo requerido (`required`) con una opción placeholder por defecto seleccionada y deshabilitada (`<option value="" disabled>Seleccione una razón...</option>`), estrictamente mapeado a las 4 opciones permitidas, "Nota Explicativa" (textarea obligatorio) y "Horas límite". Asegurar que `timebombHours` sea un entero > 0 y <= 168 usando `<input type="number" step="1">` y validación de esquema que rechace flotantes.
  - [ ] **Reglas SCHEDULED**: Pedir fecha y hora usando `<input type="datetime-local">` nativo. Inyectar dinámicamente `min` (15 minutos en el futuro) y `max` (30 días). ADVERTENCIA: NO usar `.toISOString()` estándar para los atributos `min`/`max` en HTML, se debe calcular ajustando el offset local: `new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)`. Además, se debe realizar una validación estricta de la fecha seleccionada en el momento exacto del `onSubmit` asegurando `selectedDate.getTime() >= Date.now() + 15 * 60000`, no depender únicamente del atributo HTML5 `min`. Al enviar el payload, convertir explícitamente a UTC usando `new Date(inputValue).toISOString()`.
  - [ ] **Integración API**: Enlazar con `PATCH /api/chat/:id/status`. Para ON_HOLD, concatenar razón y nota: `[${reason}] ${nota}`. Parsear explícitamente `parseInt(timebombHours, 10)`. (Consultar la sección API Contracts para las estructuras exactas de los payloads).
- [ ] Task 4: Manejo de errores de API
  - [ ] Capturar explícitamente todos los errores de respuesta no-2xx (incluyendo 400 Bad Request, 500 Internal Server Error y network timeouts) al cambiar estados (ej. race conditions si el cliente contesta mientras el vendedor acciona) y mostrar un toast/alert. En caso de error de API al enviar los modales, el modal DEBE permanecer abierto, mostrar el error internamente, y el estado del formulario NO DEBE limpiarse para prevenir la pérdida de notas escritas. El cierre automático del modal y limpieza del estado debe estar vinculado explícitamente a una respuesta exitosa (200 OK) de la API.
  - [ ] Action State Lock-In: Asegurar de forma estricta que el estado global `isLoading/isPatching` se resetee a `false` dentro de un bloque `finally` o capturador de errores para prevenir que la interfaz quede congelada en caso de fallo de API.

### Review Findings

- [x] [Review][Patch] Missing explicit WebSocket event listener for status updates [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] Unauthorized role bypass for vendor action visibility restriction [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] Action buttons remain enabled during Empty State (0 messages) [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] Missing explicit `aria-disabled="true"` attribute on disabled buttons [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] Silent coercion of decimal inputs instead of explicit rejection [frontend/src/features/chat/components/ChatActionModals.jsx]
- [x] [Review][Patch] Modal state leaks across conversations when switching [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] Custom modal lacks standard accessibility features (Escape key, click-outside) [frontend/src/features/chat/components/ChatActionModals.jsx]
- [x] [Review][Defer] Critical IDOR Vulnerability in Status Updates [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Dynamic Requires in Route Handlers [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Stringly-Typed Error Handling [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Loss of Paused Time for SLA Calculations [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Missing Concurrency Control in SLA Resumption [backend/src/services/sla.service.js] — deferred, pre-existing
- [x] [Review][Defer] Inefficient DB Queries in WhatsApp Auto-Resume [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Inconsistent Lock Scoping in Chat Routes [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Dynamic Requires in WhatsApp Service [backend/src/services/whatsapp.service.js] — deferred, pre-existing
- [x] [Review][Defer] Unsafe Type Casting for Timebombs [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Defer] Magic Numbers and Hardcoded Limits [backend/src/routes/chat.routes.js] — deferred, pre-existing
- [x] [Review][Patch] Unauthorized role bypass for vendor action visibility restriction remains unfixed [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] DISCARDED button remains enabled during Empty State and lacks ARIA attributes [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] Main dropdown trigger disabled during Empty State hides secondary action visibility [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] Cart button is unintentionally removed in CLOSED and ESCALATED states [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] False-positive modal cancellation alerts on successful user actions [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] Modal closes prematurely on Escape during active API request [frontend/src/features/chat/components/ChatActionModals.jsx]
- [x] [Review][Patch] Pending modal request applied to wrong conversation on switch [frontend/src/pages/ChatView.jsx]
- [x] [Review][Defer] Component bloat in ChatHeaderActions [frontend/src/pages/ChatView.jsx] — deferred, pre-existing
- [x] [Review][Defer] Lack of focus trapping in Modals [frontend/src/features/chat/components/ChatActionModals.jsx] — deferred, pre-existing
- [x] [Review][Patch] Modal closes prematurely on Escape key press during active API request [frontend/src/features/chat/components/ChatActionModals.jsx]
- [x] [Review][Patch] Customer message cancels action while patch is in flight [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] scheduledAt parses to Invalid Date causing crash [frontend/src/features/chat/components/ChatActionModals.jsx]
- [x] [Review][Patch] API error is silently swallowed in DISCARDED modal [frontend/src/features/chat/components/ChatActionModals.jsx]
- [x] [Review][Patch] Missing strict JS validation for maximum 30 days limit on SCHEDULED modal [frontend/src/features/chat/components/ChatActionModals.jsx]
- [x] [Review][Patch] Stale closure on isPatching in useEffect [frontend/src/pages/ChatView.jsx]
- [x] [Review][Patch] Cart Button unintentionally hidden in PENDING_ASSIGNMENT [frontend/src/pages/ChatView.jsx]
- [x] [Review][Defer] Missing Zustand Store Updates for API Sync and Action State Lock-In [frontend/src/stores/useChatStore.js] — deferred, pre-existing


## Dev Notes

### API Contracts

Al integrar con `PATCH /api/chat/:id/status`, los payloads exactos deben estructurarse de la siguiente manera:

```json
// ON_HOLD Payload (timebombHours casteado explícitamente a entero)
{
  "status": "ON_HOLD",
  "reason": "[Razón] Nota...",
  "timebombHours": 24
}

// SCHEDULED Payload (scheduledAt en formato ISO-8601 UTC)
{
  "status": "SCHEDULED",
  "scheduledAt": "2026-08-14T10:00:00Z"
}
```

### Arquitectura y Restricciones

- Relevant architecture patterns and constraints:
  - Frontend está construido con **React 19**, **Vite 8**, **Tailwind 4** y **Framer Motion 12**.
  - **Manejo de estado**: Usar Zustand (e.g. `useChatStore`). Buscar en `frontend/src/store/` para identificar paths exactos del `tenant` y `currentUser`. ¡Importante! Desestructurar el estado de Zustand selectivamente (ej. `const status = useChatStore(s => s.chat?.status)`) o usar `useShallow` cuando se extraigan múltiples propiedades para prevenir renderizados innecesarios.
  - **Guardrails Checklist**: (Edge Case / Null Safety)
    - **Null Pointer Trap**: Añadir un guardarraíl explícito para manejar de forma segura la nulabilidad del objeto principal (`chat`) y su estado (`chat?.status`) ANTES de evaluar la Matriz de Estados, previniendo crashes en renders iniciales.
    - **Último Mensaje**: Utilizar el patrón seguro `const lastMsg = chat?.messages?.at(-1)` y validar el sender (`lastMsg?.sender === 'VENDOR'`) para evitar crashes por null pointer.
  - Las llamadas a API se hacen utilizando la configuración en `frontend/src/services/api.js`.
  - Vendor UI Scope (ESCALATED): La UI del vendedor simplemente debe ocultar los botones en el estado `ESCALATED`. El badge "Escalado" debe reemplazar completamente los botones de acción en el header para prevenir saltos de diseño. El Dev Agent NO DEBE intentar construir ni implementar la lógica del Coordinador en esta historia.

### Concurrency & Real-time Rules

- **Zustand & API Sync**: Asegurar que el estado del chat se sincronice correctamente vía WebSockets (en Zustand) para la actualización en tiempo real de los botones y el estado de carga. Actualizar el estado de Zustand inmediatamente DESPUÉS de recibir el 200 OK invocando explícitamente la acción setter designada del store (ej. `updateChat`) y pasándole el objeto JSON completo retornado por la API, para evitar desincronizaciones y no depender únicamente de WebSockets para la transición.
- **WebSocket Event Disconnect**: Se debe escuchar activamente por eventos de *actualización de estado del chat* desde el WebSocket (no solo eventos de mensajes) para asegurar que los botones de la UI se actualicen dinámicamente cuando el backend auto-reanude el chat. El agente de desarrollo debe inspeccionar el código emisor del socket en el backend o el registro de listeners en el frontend para descubrir el NOMBRE EXACTO DEL EVENTO antes de implementar el listener. Se requiere una función estricta de limpieza (cleanup function) en el `useEffect` (ej. `return () => socket.off(...)`) para los listeners del socket y prevenir leaks exponenciales de memoria.
- **Modal Race Condition**: Implementar lógica restrictiva: Los nuevos mensajes del cliente SÓLO DEBEN cerrar el modal `SCHEDULED` (ya que requiere que el último mensaje sea del vendedor). Los nuevos mensajes del cliente NO DEBEN cerrar el modal `ON_HOLD`. Los cambios de estado (status_change) sí deben cerrar cualquier modal abierto. `IF (modal_SCHEDULED_open AND new_message.sender === 'CUSTOMER') OR status_change THEN close_modal()`. Si se cumple esta condición vía WebSockets, se debe lanzar además una alerta al usuario y llamar a `clear_state()` o preservar el texto del borrador en el estado (Data Loss Prevention) para que el vendedor no pierda lo escrito por un auto-resume. OTRAS mutaciones del chat NO DEBEN cerrar el modal bajo ninguna circunstancia, evitando así la pérdida de datos del formulario en progreso. Utilizar `inline code` o constantes explícitas al parsear payloads entrantes para validar eventos.
- Source tree components to touch:
  - `frontend/src/features/chat/components/` (Componentes que engloban la vista del chat). Extraer los modales en archivos separados (ej. `frontend/src/features/chat/components/ChatActionModals.jsx`).
  - `frontend/src/components/ui/` (Componentes compartidos como Modals, Buttons, Inputs).
- Testing standards summary:
  - Testing está contemplado con Vitest y React Testing Library.

### Project Structure Notes

- Alignment with unified project structure: El desarrollo debe encapsularse principalmente en el feature `chat` (`frontend/src/features/chat/`).

### References

- [Epic Reference: epic-advanced-lifecycle.md](file:///C:/Users/rodro/Documents/workspace/Proyectos-Spec-Driven/BMAD/chat-multichannel-sales-ia/_bmad-output/implementation-artifacts/epic-advanced-lifecycle.md#L48-L60)
- [Architecture doc: architecture.md](file:///C:/Users/rodro/Documents/workspace/Proyectos-Spec-Driven/BMAD/chat-multichannel-sales-ia/_bmad-output/planning-artifacts/architecture.md)

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro

### Debug Log References

N/A

### Completion Notes List

- Generación automatizada de la historia 1.4 de acuerdo con el template establecido.
- Se ha incluido contexto explícito sobre la ubicación del código y la arquitectura del frontend.

### File List

- `_bmad-output/implementation-artifacts/1-4-interfaz-acciones-chat.md`
