---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-core-experience', 'step-04-emotional-response', 'step-05-inspiration']
inputDocuments:
  - _bmad/project-context.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-28-ui-design.md
---

# UX Design Specification - chat-multichannel-sales-ia

**Author:** Jefazo
**Date:** 2026-04-14

---

## Executive Summary

**SalesFlow** es una plataforma SaaS multi-tenant que transforma WhatsApp en un canal empresarial supervisado. Opera como un proxy: un número de WhatsApp Business multiplexado a múltiples vendedores, con un agente IA (RAG) como primer nivel de respuesta y un coordinador con visibilidad y control total.

### Project Vision

**Core Insight:** El vendedor es el canal, pero la empresa es la dueña de la relación.

**Differentiator UX:** Una experiencia que hace invisible la complejidad técnica (proxy, IA, handoffs) mientras preserva la continuidad de la relación cliente-empresa.

### Target Users

| Usuario | Contexto | Dispositivo Principal | Dispositivo Secundario |
|---------|----------|------------------------|------------------------|
| **Roberto (Vendedor)** | Campo, movimiento, 40+ clientes | Mobile (iOS/Android) | Desktop (casa) |
| **María (Coordinadora)** | Oficina, supervisión, 8 vendedores | Desktop (Web) | — |
| **Admin** | Configuración técnica, onboarding | Desktop (Web) | — |

**Usuario Vendedor:**
- Trabaja principalmente en campo (mobile-first)
- Necesita acceso rápido a contexto e historial
- También trabaja desde casa en desktop ocasionalmente
- Requiere notificaciones sonoras para respuesta inmediata

**Usuario Coordinador:**
- Necesita visibilidad de múltiples conversaciones simultáneamente
- Requiere dos modalidades de vista:
  - **Vista Previa:** Mini-ventanas con 2 filas de conversación en flujo en tiempo real
  - **Vista Foco:** Selección de 1-2 chats para atención detallada
- Interviene directamente cuando hay alertas SLA o IA escala

### Key Design Challenges

| Desafío | Descripción | Impacto |
|---------|--------------|---------|
| **Doble Plataforma** | Mobile para vendedores, Desktop para coordinadores | Dos experiencias distintas con coherencia visual |
| **Complejidad Invisible** | Proxy + IA + Handoff deben sentirse naturales | Transiciones suaves, indicadores sutiles |
| **Visibilidad vs. Sobrecarga** | Coordinador ve muchos chats sin abrumarse | Vista previa compacta + filtros inteligentes |
| **Movilidad en Campo** | Vendedor responde en movimiento, manos libres limitadas | Acciones rápidas, Command Palette, atajos |
| **Continuidad de Contexto** | Reasignación de clientes sin pérdida de información | Historial preservado, comentarios inline |

### Design Opportunities

| Oportunidad | Descripción | Valor |
|-------------|-------------|-------|
| **Command Palette Universal** | Cmd+K para búsqueda rápida de clientes, documentos, etiquetas | Acceso en <3 clicks |
| **Transición IA → Humano Sutil** | Barra de estado con transición animada suave, indicador no intrusivo | Experiencia fluida |
| **Vista Dual para Coordinador** | Panel de previews + Focus mode para 1-2 chats | Visibilidad sin sobrecarga |
| **Búsqueda Contextual** | Pivote por cliente, cascade por tipo de documento | Encuentra información en segundos |
| **Etiquetas Inline** | Tags visuales en puntos del chat, filtro por etiqueta | Organización visual inmediata |

### Confirmed Design Decisions

| Aspecto | Decisión |
|---------|----------|
| **Estética** | Glassmorphism + Gradientes (base moderna) |
| **Paleta** | Slate (#0F172A → #334155) + Coral UI (#FB7185) + Naranja CTAs (#F97316) |
| **Sidebar** | Fijo, no colapsable, iconos + texto siempre visibles |
| **Navegación** | Command Palette (Cmd+K) + atajos de teclado contextuales |
| **Transición IA/Humano** | Transición suave con indicador sutil |
| **Vista Coordinador** | Dual: Preview mode (2 filas por chat) + Focus mode (1-2 chats) |

## Core User Experience

### Defining Experience

**Core User Action:**

| Usuario | Acción Core |
|---------|-------------|
| **Vendedor** | Responder mensajes de clientes asignados |
| **Coordinador** | Supervisar conversaciones activas y detectar problemas |

**La acción crítica que debe ser perfecta:**
> El vendedor abre un chat y responde en menos de 30 segundos con contexto completo disponible.

Si acertamos en esto, todo lo demás sigue. El vendedor debe sentir que tiene superpoderes: sabe todo lo que ha pasado con el cliente sin esfuerzo.

### Platform Strategy

| Plataforma | Usuario | Modo Principal | Modo Secundario |
|------------|---------|----------------|-----------------|
| **Mobile App (iOS/Android)** | Vendedor | Touch-based, en movimiento | — |
| **Web App (Desktop)** | Coordinador | Mouse/keyboard, oficina | — |
| **Web App (Desktop)** | Admin | Mouse/keyboard | — |

**Requisitos por plataforma:**

| Plataforma | Requisitos Clave |
|------------|------------------|
| **Mobile** | Notificaciones push sonoras, acceso offline parcial, gestos swipe, atajos touch |
| **Web Desktop** | Command Palette (Cmd+K), atajos de teclado, vista multi-panel |

**Sin requisitos offline completos** — el sistema requiere conexión para operar (mensajería en tiempo real).

### Effortless Interactions

**Lo que debe sentirse completamente natural y sin esfuerzo:**

| Interacción | Cómo se hace Effortless |
|-------------|------------------------|
| **Encontrar contexto de un cliente** | Historial completo visible al abrir chat, etiquetas visuales, búsqueda instantánea |
| **Saber quién responde (IA vs Humano)** | Indicador sutil, no intrusivo, transición suave |
| **Reasignar un cliente** | Drag & drop o click en avatar, comentarios inline |
| **Detectar problemas (Coordinador)** | Alertas proactivas, color coding, badges en chats |
| **Pedir ayuda a la IA** | Comando "/" dentro del chat, respuesta inline |

**Lo que eliminamos vs. competidores:**
- ❌ Buscar historial en múltiples lugares → ✅ Todo en un chat con etiquetas
- ❌ Preguntar "¿quién atendió esto?" → ✅ Timeline visible de participaciones
- ❌ Perder contexto cuando cambia vendedor → ✅ Historial preservado 100%

### Critical Success Moments

**Momentos que definen éxito o fracaso:**

| Momento | Usuario | Qué debe pasar | Si falla |
|---------|---------|----------------|----------|
| **Onboarding de nuevo vendedor** | Admin | Setup completo en < 30 min | Frustración, abandono |
| **Primer mensaje de cliente nuevo** | Cliente | Respuesta IA en < 5 segundos | Percepción de empresa lenta |
| **Handoff IA → Vendedor** | Vendedor | Notificación + contexto completo | Pérdida de confianza |
| **Alerta SLA excedido** | Coordinador | Detección + intervención en segundos | Cliente insatisfecho |
| **Reasignación de cliente** | Vendedor | Historial + comentarios visibles | "No sé qué pasó con este cliente" |

**El momento "Wow":**
> Cuando un vendedor abre un chat y ve el historial completo con etiquetas a cotizaciones, comentarios del coordinador, y contexto del cliente — sin buscar nada.

### Experience Principles

**Principios guía para todas las decisiones UX:**

| # | Principio | Aplicación |
|---|-----------|------------|
| **1** | **Contexto siempre visible** | El usuario nunca tiene que buscar información que ya debería tener |
| **2** | **Acciones en < 3 clicks** | Command Palette, atajos, gestos para acceso instantáneo |
| **3** | **Complejidad invisible** | IA, proxy, handoffs ocurren sin que el usuario lo note |
| **4** | **Alertas proactivas, no reactivas** | El sistema avisa antes de que el problema ocurra |
| **5** | **Transiciones suaves** | Cambios de estado (IA/Humano, reasignación) con animaciones sutiles |

## Desired Emotional Response

### Primary Emotional Goals

| Usuario | Emoción Primaria | Emoción Secundaria | Emoción a Evitar |
|---------|------------------|--------------------|--------------------|
| **Vendedor** | **Empoderado** — "Sé exactamente qué pasa con cada cliente" | Confianza, Control | Ansiedad, Pérdida |
| **Coordinador** | **Visibilidad** — "Tengo el control total sin microgestionar" | Seguridad, Tranquilidad | Desconocimiento, Sorpresas negativas |
| **Cliente** | **Atención** — "Me responden rápido y saben quién soy" | Respeto, Valor | Ignorado, Frustración |

**Emoción diferenciadora:**
> El vendedor siente que tiene "superpoderes" — información completa disponible instantáneamente, sin buscar.

### Emotional Journey Mapping

**Journey emocional del Vendedor:**

| Etapa | Emoción Deseada | Diseño que lo Apoya |
|-------|-----------------|---------------------|
| **Descubrimiento** | Curiosidad → Interés | Demo clara, valor evidente |
| **Onboarding** | Confianza → Competencia | Setup en < 30 min, UI intuitiva |
| **Uso diario** | Empoderamiento → Maestría | Contexto visible, Command Palette |
| **Problema (handoff)** | Seguridad → Resolución | Transición IA→Humano suave, alertas claras |
| **Retorno** | Familiaridad → Eficiencia | Preferencias guardadas, historial preservado |

**Journey emocional del Coordinador:**

| Etapa | Emoción Deseada | Diseño que lo Apoya |
|-------|-----------------|---------------------|
| **Descubrimiento** | Interés → Expectativa | Dashboard demo, métricas visibles |
| **Supervisión diaria** | Control → Tranquilidad | Vista de previews, alertas proactivas |
| **Intervención** | Seguridad → Acción | Un click para intervenir, contexto completo |
| **Revisión** | Satisfacción → Confianza | Métricas de productividad, SLAs cumplidos |

### Micro-Emotions

**Estados emocionales críticos para el éxito:**

| Micro-Emoción | Contexto | Diseño UX | Emoción Opuesta a Evitar |
|---------------|----------|------------|--------------------------|
| **Confianza** | Abrir un chat desconocido | Historial completo visible | Confusión, Incertidumbre |
| **Control** | Ver todos los chats asignados | Filtros, badges, estados claros | Sobrecarga, Pérdida |
| **Velocidad** | Encontrar una cotización | Búsqueda instantánea, etiquetas | Frustración, Impaciencia |
| **Seguridad** | Handoff IA → Humano | Transición visible, notificación clara | Ansiedad, Duda |
| **Logro** | Resolver un cliente | Checkmarks, confirmación | Incompletud |
| **Conexión** | Ver comentarios del coordinador | Comentarios inline, contexto | Aislamiento |

**Micro-emociones más críticas:**
1. **Confianza** — al abrir cualquier chat, saber que tienen todo el contexto
2. **Control** — sentir que dominan la situación, no que el sistema los domina
3. **Velocidad** — sentir que el sistema "anticipa" sus necesidades

### Design Implications

**Conexiones Emoción → Diseño:**

| Emoción Objetivo | Decisión de Diseño |
|------------------|---------------------|
| **Empoderamiento** | Contexto SIEMPRE visible sin buscar |
| **Confianza** | Indicadores claros de quién está respondiendo (IA/Humano) |
| **Control** | Vista dual para coordinador (previews + focus) |
| **Velocidad** | Command Palette, atajos, búsqueda instantánea |
| **Seguridad** | Transiciones suaves, sin cambios abruptos |
| **Logro** | Feedback visual inmediato (enviado, leído, resuelto) |

**Momentos de Delight:**

| Momento | Micro-interacción |
|---------|-------------------|
| Encontrar cotización en 2 segundos | Animación de búsqueda instantánea, resultado resaltado |
| Ver que la IA respondió correctamente | Indicador sutil de "IA atendió", confianza |
| Reasignar cliente sin pérdida | Animación de transferencia suave, comentarios inline |
| Coordinador interviene sin fricción | Aparece en chat sin notificación invasiva |

### Emotional Design Principles

| # | Principio | Aplicación |
|---|-----------|------------|
| **1** | **Información anticipada** | El sistema muestra lo que necesitan antes de que lo busquen |
| **2** | **Transparencia sin ansiedad** | Los cambios de estado son visibles pero no alarmistas |
| **3** | **Eficiencia sentida** | Cada acción debe sentir instantánea (feedback visual < 100ms) |
| **4** | **Confianza visual** | Indicadores claros de estado (quién responde, qué pasó) |
| **5** | **Respeto del tiempo** | Sin pasos innecesarios, sin confirmaciones excesivas |

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Productos de Referencia:**

| Producto | Por qué inspira | Usuarios que lo aman |
|----------|----------------|----------------------|
| **WhatsApp Business** | Comunicación directa, familiar, omnipresente | Vendedores y clientes |
| **Linear** | Command Palette, interfaz limpia, atajos de teclado, velocidad | Coordinadores (gestión) |
| **Slack** | Indicadores de estado, threads, notificaciones granulares, búsqueda | Coordinadores (equipos) |
| **Discord** | Sidebar con canales, roles visuales, estados de presencia | Vendedores (comunidades) |

**Análisis de Éxito por Producto:**

| Producto | Problema que Resuelve | UX Éxito | Lección para SalesFlow |
|----------|----------------------|----------|------------------------|
| **WhatsApp Business** | Comunicación instantánea con clientes | Familiaridad, simplicidad extrema | No reinventar lo que ya funciona |
| **Linear** | Gestión de proyectos complejos | Velocidad, Command Palette, atajos | Acciones en <3 clicks para coordinadores |
| **Slack** | Comunicación de equipos | Notificaciones configurables, threads | Separar signal de noise para coordinador |
| **Discord** | Comunidades y roles | Visibilidad de roles, estados | Indicadores claros de quién hace qué |

### Transferable UX Patterns

**Patrones de Navegación:**

| Patrón | Fuente | Aplicación en SalesFlow |
|--------|--------|--------------------------|
| **Command Palette (Cmd+K)** | Linear | Búsqueda de clientes, documentos, etiquetas — acceso instantáneo |
| **Sidebar fijo con iconos + texto** | Slack, Discord | Navegación siempre visible, sin colapsar |
| **Breadcrumbs contextuales** | Linear | Trail de ubicación para navegación |

**Patrones de Interacción:**

| Patrón | Fuente | Aplicación en SalesFlow |
|--------|--------|--------------------------|
| **Threads con respuestas inline** | Slack | Comentarios del coordinador sin romper flujo |
| **Estados de presencia visuales** | Discord | Indicador IA/Humano con transición suave |
| **Búsqueda instantánea con filtros** | Linear | Pivote por cliente, cascade por tipo de documento |
| **Atajos de teclado contextuales** | Linear, Slack | C (compose), N (new), / (search), Esc (close) |

**Patrones de Dashboard:**

| Patrón | Fuente | Aplicación en SalesFlow |
|--------|--------|--------------------------|
| **Vista de lista compacta** | Linear | Coordinador ve múltiples chats con 2 filas de preview |
| **Badges de notificación** | Slack | Contadores en chats, alertas SLA con color coding |
| **Filtros rápidos** | Linear | Tabs por estado (Urgentes, Hoy, Esta semana) |

**Patrones de Chat:**

| Patrón | Fuente | Aplicación en SalesFlow |
|--------|--------|--------------------------|
| **Etiquetas inline en timeline** | Gmail, Slack | Tags visuales en puntos del chat |
| **Indicador de escritura** | WhatsApp, Slack | "IA está respondiendo..." vs "Roberto está escribiendo..." |
| **Respuestas rápidas (/)** | Slack | Atajos para mensajes frecuentes del vendedor |

### Anti-Patterns to Avoid

**Patrones a evitar:**

| Anti-Patrón | Fuente | Por qué evitar |
|-------------|--------|----------------|
| **Sidebar colapsable** | Algunos CRMs | Oculta opciones, vendedor en campo necesita acceso rápido |
| **Notificaciones masivas** | Slack default | Sobrecarga al coordinador, ignora alertas importantes |
| **Búsqueda en múltiples lugares** | CRMs tradicionales | Pierde contexto, frustra al vendedor |
| **Onboarding largo** | Salesforce | Abandono antes de valor, vendedor no tiene tiempo |
| **Interfaz sobrecargada** | HubSpot | Demasiada información visible, pierde lo importante |
| **Handoff abrupto IA→Humano** | Chatbots básicos | Pérdida de confianza, cliente nota la transición |

### Design Inspiration Strategy

**Qué Adoptar:**

| Patrón | Razón |
|--------|-------|
| Command Palette (Cmd+K) | Soporta principio "Acciones en <3 clicks" |
| Sidebar fijo no colapsable | Vendedor en campo necesita acceso inmediato |
| Threads inline para comentarios | Coordinador interviene sin romper conversación |
| Badges con color coding | Alertas proactivas visibles sin sobrecargar |
| Búsqueda instantánea con pivote | Soporta principio "Contexto siempre visible" |

**Qué Adaptar:**

| Patrón | Adaptación |
|--------|------------|
| Estados de presencia (Discord) | Modificar para indicar IA vs Humano vs Asignado |
| Vista de lista compacta (Linear) | Adaptar para previews de chat en tiempo real |
| Atajos de teclado | Simplificar para vendedores (menos atajos, más esenciales) |

**Qué Evitar:**

| Patrón | Razón |
|--------|-------|
| Sidebar colapsable | Conflicto con uso móvil en campo |
| Notificaciones masivas | Conflicto con emoción de "Control" del coordinador |
| Búsqueda fragmentada | Conflicto con principio "Contexto siempre visible" |