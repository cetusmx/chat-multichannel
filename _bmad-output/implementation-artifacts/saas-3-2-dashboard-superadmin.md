---
baseline_commit: 64536f8df2ed60831c5c9a129226883f1bd2d436
---

# Story saas-3.2: Dashboard Resumen

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Superadmin,
I want ver las métricas globales apenas inicio sesión,
so that entienda la salud de mi negocio.

## Acceptance Criteria

1. **Given** un inicio de sesión exitoso,
   **When** carga el Dashboard,
   **Then** veo widgets con los totales globales obtenidos del backend.

## Tasks / Subtasks

- [x] Task 1: Crear vista/componente del Dashboard y enlazar datos (AC: 1)
  - [x] Subtask 1.1: Crear página principal del Dashboard y componente reutilizable de Widget.
  - [x] Subtask 1.2: Implementar obtención de métricas usando la instancia API estándar.
  - [x] Subtask 1.3: Renderizar widgets manejando los estados de carga y error.
  - [x] Subtask 1.4: Agregar la nueva ruta del Dashboard y protegerla.

## Dev Notes

- Relevant architecture patterns and constraints:
  - Independent Subdomain Containerization (AD-3): El Dashboard del Superadmin debe ser parte de la SPA independiente (`apps/superadmin-frontend`). No mezclar con el frontend de los tenants.
  - API Contract: Use the standard `api` instance (`import api from '@/lib/axios'`) to fetch `/api/superadmin/metrics`. Explicitly require `import axios from 'axios'` alongside the `api` instance import. Assume interceptors handle the token. Do NOT manually inject the JWT. Provide the exact destructuring statement required with safe fallbacks: `const { data: { data: { tenants = 0, users = 0, aiTokens = 0 } = {} } = {} } = await api.get('/api/superadmin/metrics', { signal: controller.signal })` to match the test mock.
    - Memory Leak Prevention: Enforce the use of `AbortController` in `useEffect`. Boilerplate: `useEffect(() => { const controller = new AbortController(); const fetchData = async () => { setIsLoading(true); setError(null); try { /* use controller.signal */ } catch (error) { if (axios.isCancel(error)) return; /* set error */ } finally { if (!controller.signal.aborted) setIsLoading(false); } }; fetchData(); return () => controller.abort(); }, [retryTrigger]);`
    - Error Handling: Ignore 401/403 errors locally (defer to global interceptor) and only set the local error state for 500s or network errors. Extract message: `error?.response?.data?.message || 'Error de red'`.
  - UI/Widgets & Accessibility (a11y): For Dashboard layout, use structural classes: `grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0 m-0` and use a standard semantic `<ul>`/`<li>` grouping for the widgets to avoid redundant ARIA labels. Instruct the dev to wrap the `Skeleton` components inside `<li>` tags when they are rendered inside the `<ul>` grid container. The Dashboard page MUST include an `<h1>` (visible or `sr-only`) for screen readers. For `MetricWidget.jsx`, explicitly define the props: `title`, `value`, `isLoading`, `icon`. Explicitly require using nullish coalescing `??` instead of `||` to prevent `0` from rendering as a fallback (e.g. `{value ?? 0}`). Require the use of `.toLocaleString()` for displaying metric numbers. Clarify the `icon` prop signature (e.g., pass the component reference like `icon={Users}`). Explicitly instruct to alias the prop during destructuring for `MetricWidget`: `const MetricWidget = ({ title, value, isLoading, icon: Icon }) => ...` and render it as `<Icon className="..." />`. Use `lucide-react` for icons passed to the widget. Drop `role="region"` entirely.
  - State Machine Logic:
    - **Loading:** Render Skeletons in Grid.
    - **Success:** Render Data (MetricWidgets) in Grid.
    - **Error:** Render Alert replacing the Grid *within* the main page container, preserving the overall page layout and page title. Must include a 'Retry' button that re-triggers the API call. Implement a trigger state `const [retryTrigger, setRetryTrigger] = useState(0)` and include it in the `useEffect` dependency array `[retryTrigger]`. The retry button should call `setRetryTrigger(prev => prev + 1)`.
  - Shared Components: Clarify the import strategy for UI components to use aliases (e.g., `import { Alert } from '@/components/ui/Alert'` and `import { Skeleton } from '@/components/ui/Skeleton'`). Instruct the agent to precisely mirror the exact padding and layout classes of the real widget onto the Skeleton container instead of using hardcoded dimensions like `h-32` to prevent layout shifts.
- Source tree components to touch:
  - NEW: `apps/superadmin-frontend/src/pages/Dashboard.jsx` (Componente del Dashboard en el frontend del Superadmin).
  - NEW: `apps/superadmin-frontend/src/components/MetricWidget.jsx` (Componente reutilizable para los widgets).
  - UPDATE: `apps/superadmin-frontend/src/App.jsx` para agregar la ruta `/dashboard`. The route MUST use exact v6 syntax for the Protected Route wrapper: `import ProtectedRoute from '@/components/ProtectedRoute'` and `<Route path="/dashboard" element={<ProtectedRoute allowedRoles={['superadmin']}><Dashboard /></ProtectedRoute>} />`.
  - UPDATE: Navigation/Sidebar component to explicitly require adding a link to `/dashboard` in the Superadmin Sidebar or Navigation menu. Require the use of React Router's `NavLink` or a `location.pathname === '/dashboard'` check to conditionally apply active styling classes in the sidebar navigation.
- Testing standards summary:
  - Pruebas unitarias explícitamente requeridas en `apps/superadmin-frontend/src/pages/__tests__/Dashboard.test.jsx` y para el componente reutilizable en `apps/superadmin-frontend/src/components/__tests__/MetricWidget.test.jsx` usando **Jest + React Testing Library**. Explicitly require `beforeEach(() => { jest.resetAllMocks(); })`. Enforce the use of specific `data-testid` attributes (e.g., `data-testid="dashboard-loading"`, `data-testid="dashboard-error"`, `data-testid="metric-widget"`) in the components and tests. Tests must use `getAllByTestId('metric-widget')` or require dynamic IDs like `data-testid={\`metric-widget-${title}\`}` to avoid crashing multiple-element queries.
  - Mockear la respuesta de la API (`jest.mock('@/lib/axios')`). Explicitly define the mock JSON payload in the testing standards: `mockResolvedValue({ data: { data: { tenants: 10, users: 100, aiTokens: 5000 } } })`. Jest tests mocking the API must gracefully handle the `AbortController` signal to avoid Unhandled Promise Rejection console logs. Verifique la renderización de estados (carga, éxito, error).
  - Zero/Empty State Test Coverage: Require a specific test case that mocks `{ data: { data: { tenants: 0, users: 0, aiTokens: 0 } } }` to ensure the UI renders the zeros properly without breaking or showing empty fields.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming): Mantener la separación estricta dentro del ecosistema frontend del Superadmin (`apps/superadmin-frontend`).
- Detected conflicts or variances (with rationale): (saas-3-1) El endpoint ya existe y está protegido por el middleware `isSuperadmin`.

### References

- [Source: _bmad-output/planning-artifacts/epics-superadmin-saas.md#Story 3.2: Dashboard Resumen]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-superadmin-saas-2026-07-28/ARCHITECTURE-SPINE.md#AD-3: Independent Subdomain Containerization]

## Dev Agent Record

### Agent Model Used
Gemini 2.5 Pro

### Debug Log References
- Mocked axios and mapped globals for vitest test execution.
- Added tests matching criteria for metric states.

### Completion Notes List
- ✅ Implemented `MetricWidget` with zero states and loading skeletons.
- ✅ Implemented `Dashboard` fetching `/api/superadmin/metrics` handling states appropriately.
- ✅ Added unit tests for Dashboard and MetricWidget which check edge cases and loading states.
- ✅ Updated `App.jsx` and `SuperadminLayout.jsx` with the `/dashboard` route.

### File List
- `superadmin-frontend/src/pages/Dashboard.jsx` (NEW)
- `superadmin-frontend/src/components/MetricWidget.jsx` (NEW)
- `superadmin-frontend/src/pages/__tests__/Dashboard.test.jsx` (NEW)
- `superadmin-frontend/src/components/__tests__/MetricWidget.test.jsx` (NEW)
- `superadmin-frontend/src/App.jsx` (MODIFIED)
- `superadmin-frontend/src/components/SuperadminLayout.jsx` (MODIFIED)
- `superadmin-frontend/src/lib/axios.js` (NEW)
- `superadmin-frontend/vite.config.js` (MODIFIED)
- `superadmin-frontend/package.json` (MODIFIED)
