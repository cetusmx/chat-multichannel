# Story 6.1: React Native Project Scaffold

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to set up the React Native mobile app in the monorepo,
so that mobile development can begin.

## Acceptance Criteria

1. **Given** the monorepo, **When** initialized, **Then** the `mobile` folder contains a working React Native scaffold connected to the backend API.
2. **Given** the project architecture, **When** examining the source tree, **Then** all explicitly named screens and components from the architecture document are present as placeholders.

## Tasks / Subtasks

- [ ] Task 1 (AC: 1): Scaffold React Native project (STRICTLY React Native CLI, NO EXPO)
  - [ ] Run initialization command at the repository root: `npx @react-native-community/cli init mobile`.
  - [ ] Configure `mobile/app.json` and basic build settings.
- [ ] Task 2 (AC: 1): Platform-Agnostic Store Refactor & Code Sharing
  - [ ] **CRITICAL**: Refactor `frontend/src/stores/useChatStore.js` and `useAuthStore.js` to decouple them from Web APIs. Extract dependencies like `localStorage` and `window.location.origin` by implementing Dependency Injection (e.g., inject the API client and Socket URL at initialization) or extract the logic to a platform-agnostic `shared/` structure.
  - [ ] **WARNING (React Native Hoisting)**: DO NOT use standard npm/yarn workspaces without strict `nohoist` configurations. React Native's iOS/Android build scripts will break if native dependencies are hoisted to the root `node_modules`. Recommend keeping the `mobile` app decoupled from workspaces and using `metro.config.js` plus `babel-plugin-module-resolver` to resolve absolute paths to the shared web code instead.
- [ ] Task 3 (AC: 1): Install core dependencies (Exact packages)
  - [ ] Install React Navigation 7: `@react-navigation/native`, `@react-navigation/native-stack`, and native dependencies (`react-native-screens`, `react-native-safe-area-context`).
  - [ ] Install `zustand`.
  - [ ] Install `socket.io-client`.
  - [ ] Install `react-native-keychain`.
  - [ ] Install `react-native-config` (or `react-native-dotenv`) to enable `.env` support.
  - [ ] Install `babel-plugin-module-resolver`.
  - [ ] **CRITICAL**: Run `cd mobile/ios && pod install` (or use `npx pod-install ios`) to link all native dependencies properly. Do not skip this step or the iOS build will fail.
- [ ] Task 4 (AC: 1, 2): Setup Project Structure & Architecture Placeholders
  - [ ] Create directory skeleton: `src/screens`, `src/components`, `src/hooks`, `src/services`, `src/stores`, `src/utils`.
  - [ ] **CRITICAL**: Scaffold EXACT placeholder screens from architecture: `LoginScreen.jsx`, `ChatListScreen.jsx`, `ChatDetailScreen.jsx`, `ProfileScreen.jsx`.
  - [ ] **CRITICAL**: Scaffold EXACT placeholder components from architecture: `ChatBubble.jsx`, `MessageInput.jsx`, `StatusIndicator.jsx`.
  - [ ] Scaffold a UI Theme file (e.g. `src/utils/theme.js`) exporting the exact UX-DR9 color palette (Slate #0F172A to #334155, Coral #FB7185, Orange CTA #F97316) to ensure styling consistency with the frontend.
  - [ ] Scaffold `__tests__/` directory and verify Jest is configured with the `react-native` preset.
  - [ ] Setup entry points: `index.js` and `App.jsx`.
- [ ] Task 5 (AC: 1): Base API connection blueprint
  - [ ] Scaffold `services/api.js` mimicking the frontend's Axios/fetch interceptor logic but using `react-native-keychain` for JWT storage instead of localStorage.
  - [ ] Scaffold `services/socket.js` pointing to the backend URL via environment variables (using `react-native-config`).

### Review Findings

- [x] [Review][Patch] socket.js duplicate websocket implementation — Remove mobile socket.js and rely on useChatStore.js for socket management.
- [x] [Review][Patch] useAuthStore.js rehydrate sync/async race condition [frontend/src/stores/useAuthStore.js:33]
- [x] [Review][Patch] useChatStore.js SOCKET_URL and api dependency injection race condition [frontend/src/stores/useChatStore.js]
- [x] [Review][Patch] api.js token refresh mechanism unhandled promise rejection [mobile/src/services/api.js]
- [x] [Review][Patch] api.js BASE_URL hardcodes Android emulator networking [mobile/src/services/api.js:4]
- [x] [Review][Patch] socket.js captures auth token exactly once [mobile/src/services/socket.js:11]
- [x] [Review][Patch] App.jsx hardcodes Login as initial route [mobile/App.jsx]
- [x] [Review][Patch] Incorrect alias path for shared stores [mobile/App.jsx:12]
- [x] [Review][Patch] api.js clearAuth() on 401s doesn't trigger navigation redirect [mobile/src/services/api.js:25]
- [x] [Review][Patch] keychainStorage.js logs raw error objects [mobile/src/utils/keychainStorage.js]
- [x] [Review][Patch] Missing directory skeletons [mobile/src/]
- [x] [Review][Defer] keychainStorage.js shoves entire state tree into password field [mobile/src/utils/keychainStorage.js] — deferred, pre-existing

### Review Findings (Pass 2)
- [x] [Review][Patch] App.jsx UI Flicker on cold start — Add `if (!useAuthStore.persist.hasHydrated()) return null;`
- [x] [Review][Patch] useChatStore.js Native URL crash — Default `SOCKET_URL` to `null` in native, avoid init until injected.
- [x] [Review][Patch] api.js token refresh JSON parse crash — Wrap `refreshRes.json()` to handle HTML proxy errors.
- [x] [Review][Patch] api.js Incorrect alias path for useAuthStore — Change to `@shared/stores/useAuthStore`.
- [x] [Review][Patch] useChatStore.js brittle ALERTS_URL replace — Use regex `/\/chat$/`.
- [x] [Review][Patch] App.jsx vs api.js Base URL inconsistency — Standardize usage of `Config.BACKEND_URL`.
- [x] [Review][Patch] keychainStorage.js hardcoded service name — Avoid hardcoded 'salesflow_user'.
- [x] [Review][Patch] useAuthStore.js dummy storage synchronous methods — Return `Promise.resolve()`.

### Review Findings (Pass 3)
- [x] [Review][Patch] useAuthStore.js and useChatStore.js React Native `window` false positive — `window` is defined in RN but lacks DOM APIs. Use `window.localStorage` and `window.location` checks.
- [x] [Review][Patch] keychainStorage.js storage collision — Include store `name` in keychain service name to avoid overwriting multiple Zustand stores.
- [x] [Review][Patch] useAuthStore.js Unhandled promise rejection on rehydrate — Wrap `persist.rehydrate()` inside `configureAuthStorage` in a try/catch.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - **Framework**: MUST use React Native CLI. DO NOT use Expo.
  - **State Management**: MUST share Zustand stores with the web app (e.g., `useAuthStore`, `useChatStore`). Do not reinvent the state logic. **Warning**: Web stores currently import `../services/api.js` and `window.location`. You MUST refactor them to be platform-agnostic before sharing, otherwise the mobile app will crash.
  - **Async Storage Syncing**: When refactoring `useAuthStore.js`, remember that `react-native-keychain` is asynchronous. You MUST wrap it using Zustand's `createJSONStorage` to handle the async hydration correctly without breaking the app state.
  - **Navigation**: React Navigation 7.
  - **Secure Storage**: MUST use `react-native-keychain` for all auth tokens.
  - **Styling System**: MUST rely on `StyleSheet` referencing the `theme.js` exports to replicate the web's Tailwind 4 color palette (Slate, Coral, Orange).
  - **Push**: **CRITICAL FIREBASE TRAP**: DO NOT install or configure Firebase or APNs in this story. Defer ALL push notification libraries and setup to 6.2. Installing `@react-native-firebase/messaging` without having the `google-services.json` and `GoogleService-Info.plist` files will instantly crash the iOS and Android native compilation.
- **Source tree components to touch**:
  - `frontend/src/stores/*` (Refactoring for platform independence)
  - `mobile/package.json`
  - `mobile/metro.config.js`
  - `mobile/babel.config.js`
  - `mobile/App.jsx`
  - `mobile/src/*`
- **Testing standards summary**:
  - Use Jest configured with the `react-native` preset.
  - Ensure unit testing capabilities are wired correctly for platform-agnostic modules and stores.

### Project Structure Notes

- Alignment with unified project structure:
  - `mobile/src/screens/`
  - `mobile/src/components/`
  - `mobile/src/hooks/`
  - `mobile/src/services/`
  - `mobile/src/stores/` (Alias or symlink to web stores, post-refactor)
  - `mobile/src/utils/`
- Detected conflicts or variances (with rationale): None. The mobile architecture perfectly aligns with standard React Native CLI defaults and our unified folder structure.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6: Mobile Experience]
- [Source: _bmad-output/planning-artifacts/architecture.md#Mobile Project Structure]

## Dev Agent Record

### Agent Model Used

Antigravity 2.0 (Gemini)

### Debug Log References

- Loaded epics.md and architecture.md for scaffold context.
- Validated state sharing compatibility with Web APIs.
- Identified and mitigated React Native monorepo hoisting constraints and async storage hydration traps.
- Eliminated Firebase compilation crash risks by strictly deferring dependencies to 6.2.
- Ensured strict 1:1 structural scaffolding for all architecture screens/components and UI colors.
- Enforced strict template.md compliance for AC traceability and testing standards.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `mobile/package.json`
- `mobile/app.json`
- `mobile/App.jsx`
- `mobile/index.js`
- `mobile/src/*`
