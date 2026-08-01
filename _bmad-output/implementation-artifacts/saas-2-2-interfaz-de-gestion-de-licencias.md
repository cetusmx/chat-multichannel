# Story saas-2.2: Interfaz de Gestión de Licencias

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Superadmin,
I want asignar límites o licencias permanentes a los clientes,
so that pueda configurar lo que compraron de forma segura y sin inconsistencias.

## Acceptance Criteria

1. **Given** que estoy viendo los detalles de un Inquilino en el dashboard de Superadmin,
   **When** el formulario de licencias carga (mostrando skeletons mientras obtiene la data),
   **Then** los inputs se pre-llenan con los valores actuales del `Tenant` (maxUsers, maxAiTokens, licenseType) y el atributo `min` de `maxUsers` se establece en `currentActiveUsers` (provisto por el backend) para prevenir errores de validación.

2. **Given** que modifico la configuración de licencias,
   **When** elijo el tipo `SUBSCRIPTION`,
   **Then** debo poder establecer números enteros (≥ -1 y ≤ 2147483647) tanto para `maxUsers` como para `maxAiTokens` (donde -1 significa ilimitado).

3. **Given** que modifico la configuración de licencias,
   **When** elijo el tipo `LIFETIME` (licencia permanente),
   **Then** debo poder establecer el límite de `maxUsers`, pero el campo de `maxAiTokens` (límite mensual) debe deshabilitarse y mostrar "0" o "Ilimitado" visualmente.

4. **Given** que envío el formulario con valores inválidos (e.g., maxAiTokens > 0 en LIFETIME) o la API rechaza la petición,
   **When** el sistema procesa el error,
   **Then** se rechaza con un error HTTP 400 de estructura estándar (`{ error: { message: "..." } }`) y la interfaz muestra una notificación clara (toast) indicando el mensaje exacto.

5. **Given** que envío un formulario válido,
   **When** la petición se procesa correctamente,
   **Then** el backend actualiza la base de datos (mediante transacción), retorna el `Tenant` actualizado, y la UI refleja los nuevos valores usando actualizaciones pesimistas (esperando el 200 OK antes de actualizar el estado de la UI) sin recargar la página.

## Tasks / Subtasks

- [ ] Task 1: Update Superadmin Tenant Service
  - [ ] Implement `updateTenantLicenses(tenantId, payload, superadminId)` in `superadmin.tenant.service.js`.
  - [ ] Retrieve the tenant's current active users (`status: 'ACTIVE'`, excluding suspended/deleted) in a separate query or endpoint, returning `currentActiveUsers` to the frontend.
  - [ ] Wrap operations in a Prisma Interactive Transaction: `await prisma.$transaction(async (tx) => { ... }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })` to prevent concurrent user registration race conditions during capacity checks.
  - [ ] Inside the transaction, query the tenant's current active users (`status: 'ACTIVE'`). Exclude deleted/suspended users.
  - [ ] If the new `maxUsers` is lower than the active users, throw a `BadRequestError` ("Cannot set limit below current active users").
  - [ ] If `licenseType` is `LIFETIME`, ensure `maxAiTokens` is strictly set to `0` (disabled).
  - [ ] Use `tx.tenant.update({ where: { id: tenantId }, data: { ... } })` to persist changes.
  - [ ] Catch Prisma error `P2034` (Serialization failure) resulting from the Serializable transaction and throw a 409 Conflict, or gracefully retry.
  - [ ] Catch Prisma error `P2025` (Record to update not found) which may happen on tenant deletion race conditions, and gracefully return a 404 Not Found error.
  - [ ] Deferring DB audit log for now: Enforce a strict JSON format audit trail using `logger.info({ action: 'UPDATE_TENANT_LICENSES', superadminId, tenantId, previousValues, newValues })`. (Note: Deferred DB audit log to a future story; accepting the risk of using stdout logs for now).
  - [ ] Ensure the service returns the updated `Tenant` object.

- [ ] Task 2: Create API Endpoint for License Updates
  - [ ] Define `PUT /api/superadmin/tenants/:id/licenses` in `backend/src/routes/superadmin.tenant.routes.js`.
  - [ ] Secure the endpoint strictly with the `isSuperadmin` middleware.
  - [ ] Extract `req.user.id` to pass as `superadminId` to the service.
  - [ ] Explicitly validate the `tenantId` route parameter as a valid CUID/UUID before hitting the DB. Return `400 Bad Request` if invalid.
  - [ ] Explicitly validate `tenantId` as a valid UUID/CUID format before querying the database; return a 400 Bad Request if invalid.
  - [ ] Verify `tenantId` exists; if not found, return `404 Not Found`.
  - [ ] Ensure the endpoint fetching initial Tenant details returns `currentActiveUsers` in the payload for the frontend to use.
  - [ ] Implement strict request body validation (using Joi/Zod) and strip unknown fields to prevent mass assignment vulnerabilities. Use strict checking (`strict()` in Zod) to prevent silent coercion of booleans/strings into numbers:
    - `maxUsers`: Int >= -1, <= 2147483647
    - `maxAiTokens`: Int >= -1, <= 2147483647
    - `licenseType`: Enum (`SUBSCRIPTION`, `LIFETIME`)
  - [ ] Return a 400 Bad Request immediately if `licenseType === 'LIFETIME'` and `maxAiTokens > 0`.
  - [ ] Ensure the endpoint returns `200 OK` with the updated `Tenant` payload and standardized 400 error shapes (`{ error: { message: "..." } }`) on failure.

- [ ] Task 3: Develop Superadmin SPA UI for Licensing
  - [ ] Add a "Licensing Configuration" section in the Tenant Details React view within the Superadmin Dashboard (`admin.salesflow.app` / `frontend-admin` container).
  - [ ] Display a loading skeleton while the initial `Tenant` data (including `currentActiveUsers`) is fetching.
  - [ ] Add numeric inputs for `maxUsers` and `maxAiTokens`, and a dropdown/toggle for `licenseType`. Reuse existing form/toast components.
  - [ ] Use `currentActiveUsers` (returned by the backend) to set the `min` attribute of the `maxUsers` input.
  - [ ] Implement conditional UI logic: if `licenseType === 'LIFETIME'`, visually display "0" (Disabled) for `maxAiTokens`.
  - [ ] Intercept the form submit handler to explicitly force `maxAiTokens: 0` in the payload if `LIFETIME` is selected, overriding any dirty state React might hold.
  - [ ] Programmatically reset the internal React state value for `maxAiTokens` to `0` immediately when the `LIFETIME` toggle is activated (not just intercepting on submit).
  - [ ] If reducing `maxUsers` or `maxAiTokens` from current values, show a confirmation dialog before submission.
  - [ ] Disable the submit button using the mutation's loading state (`isMutating`) to throttle submission and prevent double-clicks.
  - [ ] Use pessimistic updates for financial/license changes (wait for the 200 OK before updating UI state and cache via `queryClient.invalidateQueries`), extracting and displaying standardized 400 API error messages via toast.
  - [ ] If the backend rejects the update with the "Cannot set limit below current active users" error, explicitly invalidate the tenant query cache to fetch the new `currentActiveUsers` value immediately.

## Dev Notes

- **Architecture Constraints**:
  - **AD-1 (Total Identity Isolation)**: The API route must be strictly protected by the `isSuperadmin` middleware. Regular users (even ADMINs) must receive a 403 Forbidden.
  - **AD-2 (Parallel Service Ecosystem)**: Do NOT modify the existing tenant-facing `tenant.service.js`. All operations must occur via `superadmin.tenant.service.js`.
  - **AD-3 (Independent Subdomain Containerization)**: The UI components must be built in the Superadmin React SPA, not the main vendor SPA.
- **Database Schema**:
  - The `Tenant` table has fields: `maxUsers` (Int), `maxAiTokens` (Int), and `licenseType` (enum: SUBSCRIPTION, LIFETIME).
- **Domain Edge Cases**:
  - **Semantics of numeric limits**: `0` = disabled, `-1` = unlimited. For LIFETIME licenses, AI Tokens are disabled, so `maxAiTokens` MUST be explicitly set to `0`.
  - `maxUsers = 0` is allowed by validation, but it acts as a soft-lock preventing any users from logging in/being created.
- **Source tree components to touch**:
  - `backend/src/routes/superadmin.tenant.routes.js` (or similar Superadmin route file)
  - `backend/src/services/superadmin/superadmin.tenant.service.js`
  - `frontend-admin/src/pages/TenantDetails/` (or equivalent component in the Superadmin React SPA)

### Project Structure Notes

- **Alignment**: The API routes and services must be isolated in the backend under a `superadmin` specific structure. Frontend changes must be strictly within the Superadmin SPA project.
- **Data Isolation**: This mutation bypasses standard tenant-scoping middleware because the Superadmin operates globally, but it specifically targets a `tenantId` via the URL parameter.

### References

- [Source: _bmad-output/planning-artifacts/epics-superadmin-saas.md#Epic 2: Motor de Monetización y Licenciamiento]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-superadmin-saas-2026-07-28/ARCHITECTURE-SPINE.md#AD-1: Total Identity Isolation]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-superadmin-saas-2026-07-28/ARCHITECTURE-SPINE.md#AD-2: Parallel Service Ecosystem]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-superadmin-saas-2026-07-28/ARCHITECTURE-SPINE.md#AD-3: Independent Subdomain Containerization]

## Dev Agent Record

### Agent Model Used

Antigravity 2.0

### Debug Log References

### Completion Notes List

### File List

### Review Findings

- [ ] [Review][Decision] Spec Contradiction regarding `min` attribute of `maxUsers` — AC 1 requires `min` to be `currentActiveUsers` to prevent errors, but AC 2 allows `-1` for unlimited. The code implements `min="-1"`. We need to decide if we keep `min="-1"` or implement a separate UI toggle for "Unlimited".
- [ ] [Review][Patch] Logic bug in `isReducingUsers` and `isReducingTokens` [superadmin-frontend/src/pages/TenantDetails.jsx:423]
