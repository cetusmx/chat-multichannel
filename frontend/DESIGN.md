# SalesFlow — Guía de UI

Lenguaje visual: **editorial, plano y denso**. Superficies con borde de 1px, sin sombras
decorativas, sin gradientes ni glassmorphism. Un solo acento (naranja). Metadatos en
monoespaciada mayúscula. Referencia: `src/dev/UIPreview.jsx` (ruta `/__ui` en dev).

## Tokens (usar SIEMPRE nombres semánticos)

Definidos en `src/index.css`. Tema oscuro por defecto; `data-theme="light"` disponible.

| Uso | Clase Tailwind |
|---|---|
| Fondo de app | `bg-bg` |
| Panel / tarjeta | `bg-surface` |
| Hover, input, fila alterna | `bg-surface-2` |
| Burbuja del cliente, chip neutro | `bg-surface-3` |
| Burbuja del equipo (inversa) | `bg-surface-inverse text-fg-inverse` |
| Borde | `border-border` (fuerte: `border-border-strong`) |
| Texto principal | `text-fg` |
| Texto secundario | `text-fg-muted` |
| Texto terciario / placeholder | `text-fg-subtle` |
| Acento (CTA, activo, interno) | `bg-accent text-accent-fg`, `text-accent`, `hover:bg-accent-hover` |
| Semánticos | `success`, `warning`, `danger`, `info` (+ `/10` fondo, `/40` borde) |

**Prohibido** en código nuevo: `slate-*`, `gray-*`, `cyan-*`, `blue-*`, `emerald-*`,
`white/5`, hex literales, `sales-*` (alias legacy; existen solo para no romper lo no migrado).

## Tipografía

- Sans: Inter (`font-sans`, por defecto). Mono: JetBrains Mono (`font-mono`).
- Título de página: `text-xl font-semibold tracking-tight` (vía `PageHeader`).
- Título de sección/panel: `text-sm font-semibold` o `text-base font-semibold`.
- Cuerpo: `text-sm`. Secundario: `text-[13px] text-fg-muted`. Mínimo: `text-xs` (12px).
  `text-[10px]` solo para timestamps/contadores mono.
- Etiqueta mono mayúscula: clase `eyebrow` o componente `<Eyebrow>`.
- Cifras, precios, horas, claves: `font-mono tnum`.

## Radios y espaciado

- Controles (botón, input, chip, badge): `rounded-md`. Badge: `rounded-sm`.
- Tarjetas / paneles / burbujas: `rounded-lg`. Modales: `rounded-xl`.
- Nada de `rounded-full` salvo avatares y puntos de estado.
- Padding de panel: `p-5`. Header de panel: `px-5 py-3.5`. Filas de lista: `px-4 py-3`.

## Iconos

Solo `lucide-react`, tamaños 14–16 en controles, 11–12 dentro de eyebrows. **Sin emojis.**

## Primitivas (`src/components/ui`)

```jsx
import { Button, IconButton, Badge, StatusPill, Eyebrow, Modal, EmptyState,
         Panel, Avatar, Tabs, Field, Input, Textarea, Select, Switch,
         Spinner, Kbd, PageHeader } from '@/components/ui'  // ruta relativa real
```

- `Button variant`: `primary` (CTA, uno por vista), `secondary`, `outline`, `ghost`,
  `danger`, `success`, `inverse`, `chip`, `chip-accent`. Props `icon`, `loading`, `size`.
- `IconButton icon label` — `label` obligatorio (aria-label + title).
- `Badge tone` — `neutral | accent | success | warning | danger | info | solid-danger`.
- `StatusPill status` — estados de conversación desde `utils/conversationStatus.js`.
  Nunca mostrar enums crudos (`WAITING_CUSTOMER`) al usuario.
- `Modal open onClose title description eyebrow footer size` — portal, Escape, foco.
- `ConfirmModal` (`src/components/ConfirmModal.jsx`) para confirmaciones.
- Toasts: `import { toast } from 'stores/useToastStore'` → `toast.success/error/warning/info(title, { description })`.
  **Reemplaza todo `alert()` / `window.confirm()` / `window.prompt()`.** Para prompt usa un `Modal` con `Input`.
- `EmptyState icon title description action compact` para listas vacías.
- `Field label hint error` envolviendo `Input`/`Select`/`Textarea`.
- `Panel eyebrow title description actions` para secciones de configuración.
- `PageHeader eyebrow title description actions` al inicio de cada página.

## Patrones

- Páginas de documento (settings, usuarios, clientes): `PageHeader` + `Panel`s apilados
  con `space-y-6`. Ancho máximo `max-w-5xl` o `max-w-6xl` centrado.
- Tablas: `<table className="w-full text-sm">`, `thead` con `Eyebrow` en `th`
  (`px-4 py-2.5 text-left border-b border-border`), filas `border-b border-border/70 hover:bg-surface-2/60`.
- Formularios: grid de 2 columnas (`grid gap-4 sm:grid-cols-2`), CTA al final a la derecha.
- Estados de carga: `<Spinner />` centrado o skeleton `animate-pulse bg-surface-2 rounded-md`.
- Accesibilidad: todo botón solo-icono con `label`; inputs con `label`/`aria-label`;
  no `focus:outline-none` sin `focus:border-accent` o `focus-visible:*`.
- Textos en español, frase en minúsculas salvo nombres propios ("Base de conocimiento",
  no "Base de Conocimiento"). Evitar jerga técnica en UI (RAG, SMTP → "Correo saliente").

## Qué NO hacer

- No reintroducir CSS vanilla por página (ver `Metrics.css`, a eliminar).
- No usar `backdrop-blur`, `shadow-[0_0_...]`, `animate-pulse` en badges, gradientes de texto.
- No inventar colores por estado: usar `getStatusMeta(status).tone`.
