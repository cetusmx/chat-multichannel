# Epic: Motor Avanzado de Ciclo de Vida y SLAs
**Objetivo:** Implementar los estados operativos de clase mundial (WAITING_CUSTOMER, ON_HOLD, SCHEDULED, etc.) y un sistema de Acuerdos de Nivel de Servicio (SLA) configurable a nivel Tenant, para proteger las métricas de los vendedores y prevenir abusos en la plataforma.

**Documento Arquitectónico de Referencia:** `chat_lifecycle_and_sla.md`

---

## 📝 Story 1: Migración de Base de Datos y Configuración (Backend)
**Como** Administrador del Sistema
**Quiero** expandir los esquemas de la base de datos
**Para** soportar nuevos estados de conversación y configuraciones flexibles de SLA.

**Criterios de Aceptación:**
- [ ] Expandir el `enum Status` en `schema.prisma` agregando: `WAITING_CUSTOMER`, `SCHEDULED`, `ON_HOLD`, `DISCARDED`, `CLOSED_INACTIVE`.
- [ ] Agregar a la tabla `Tenant`: `isSlaEnabled` (Boolean, default: `true`).
- [ ] Agregar a la tabla `Tenant`: `autoCloseInactiveHours` (Int, default: `48`).
- [ ] Ejecutar la migración de Prisma sin pérdida de datos para los chats existentes.

---

## 📝 Story 2: Motor de Transición de Estados y Validaciones (Backend API)
**Como** Vendedor
**Quiero** cambiar el estado de mis conversaciones bajo reglas estrictas
**Para** pausar mi SLA cuando dependa del cliente o de un proveedor, sin hacer trampas.

**Criterios de Aceptación:**
- [ ] Modificar el endpoint `PATCH /api/chat/:id/status`.
- [ ] **Regla WAITING_CUSTOMER / SCHEDULED:** El backend debe lanzar un error `400 Bad Request` si se intenta pasar a estos estados y el último mensaje de la conversación no pertenece a un VENDOR.
- [ ] **Regla ON_HOLD:** El endpoint debe requerir obligatoriamente un campo `reason` (string) y `timebombHours` (int) en el body. Estos datos deben registrarse.
- [ ] **Auto-Reanudación:** El webhook receptor de WhatsApp/Web debe verificar si un chat está en `WAITING`, `SCHEDULED` o `ON_HOLD`. Si entra un mensaje del cliente, debe forzar el estado de vuelta a `ACTIVE`.
- [ ] **Lógica SLA:** Actualizar `sla.service.js` para respetar el flag `isSlaEnabled` del Tenant.

---

## 📝 Story 3: Cronjobs de Limpieza y Caducidad (Backend Worker)
**Como** Administrador
**Quiero** que el sistema audite automáticamente los estados pausados
**Para** cerrar prospectos abandonados y reanudar tickets de asesores olvidadizos.

**Criterios de Aceptación:**
- [ ] Crear un proceso Cron (ej. con `node-cron` o similar) que se ejecute cada hora.
- [ ] Buscar conversaciones en `WAITING_CUSTOMER` que superen las horas definidas en `tenant.autoCloseInactiveHours`. Pasarlas automáticamente a `CLOSED_INACTIVE`.
- [ ] Buscar conversaciones en `ON_HOLD` cuya `timebomb` haya expirado. Pasarlas violentamente a `ACTIVE` (reanudando el SLA).
- [ ] Buscar conversaciones en `SCHEDULED` cuya fecha programada haya llegado. Pasarlas a `ACTIVE`.

---

## 📝 Story 4: Interfaz de Acciones de Chat (Frontend UI)
**Como** Vendedor
**Quiero** una barra de acciones intuitiva en mi ventana de chat
**Para** poder clasificar y pausar mis conversaciones fácilmente.

**Criterios de Aceptación:**
- [ ] Rediseñar la barra superior del Chat (donde hoy están los botones "Resolver" y "Escalar").
- [ ] Agregar botón "Esperando al Cliente" (WAITING_CUSTOMER). Debe deshabilitarse (gris) si el último mensaje lo mandó el cliente.
- [ ] Agregar botón "Poner en Espera" (ON_HOLD). Al hacer clic, abre un Modal pidiendo "Razón" y "Horas límite" antes de ejecutar la acción.
- [ ] Agregar botón "Descartar / Spam" (DISCARDED) de color rojo para matar chats inválidos.
- [ ] Si `isSlaEnabled` es `false` en el Tenant, ocultar todos estos botones avanzados y mostrar solo una UI básica.

---

## 📝 Story 5: Métricas de Auditoría (Dashboard de Coordinador)
**Como** Coordinador
**Quiero** monitorear cómo mis vendedores usan las pausas
**Para** detectar abusos en los estados y medir la efectividad real.

**Criterios de Aceptación:**
- [ ] En la vista global, las tarjetas de métricas deben ignorar y excluir los chats `DISCARDED` y `CLOSED_INACTIVE` del cálculo de efectividad (Win Rate).
- [ ] Agregar un indicador visual o columna en la tabla de agentes que muestre el "Tiempo promedio en Hold" para identificar a quienes abusan de la pausa.
