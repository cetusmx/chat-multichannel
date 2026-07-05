---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - _bmad/project-context.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-28-ui-design.md
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 1
workflowType: 'prd'
projectType: 'brownfield'
classification:
  projectType: 'SaaS B2B'
  domain: 'CRM + Comunicaciones + IA'
  complexity: 'high'
  projectContext: 'brownfield'
  keyConcerns:
    - 'Compliance privacidad (México - LFPDPPP)'
    - 'WhatsApp Business API integration'
    - 'Agente IA con RAG'
    - 'Arquitectura multi-tenant'
    - 'Handoff IA → Humano'
vision:
  summary: 'Transformar WhatsApp de canal personal a activo empresarial controlado — la empresa posee la relación, IA garantiza respuesta inmediata, coordinador supervisa calidad.'
  differentiator: 'Arquitectura proxy supervisado — un número empresarial multiplexado a múltiples vendedores con IA como fallback inteligente y alertas proactivas.'
  coreInsight: 'El vendedor es el canal, pero la empresa es el dueño de la relación.'
  valuePillars:
    - pillar: 'Propiedad'
      problem: 'Info de clientes se va con el vendedor'
      solution: 'Historial y documentos quedan en el sistema empresarial'
    - pillar: 'Continuidad'
      problem: 'Pérdida de contexto cuando cambia vendedor'
      solution: 'Chat completo disponible para el nuevo asignado'
    - pillar: 'Calidad'
      problem: 'Atención inconsistente o lenta'
      solution: 'IA primer nivel + alertas SLA + supervisión activa'
  targetUsers:
    - 'Empresas con equipos de ventas industriales en México'
    - 'Vendedores de campo que usan WhatsApp como canal principal'
    - 'Coordinadores que necesitan visibilidad y control'
---

# Product Requirements Document - chat-multichannel-sales-ia

**Author:** Jefazo
**Date:** 2026-04-01

## Executive Summary

SalesFlow is a multi-tenant SaaS platform that transforms WhatsApp from a personal vendor channel into a controlled business asset. Designed for industrial sales teams in Mexico, it ensures the company owns the customer relationship — not individual vendors — while delivering immediate, professional attention through an AI agent (RAG) and supervised human handoff.

The platform operates as a supervised proxy architecture: a single WhatsApp Business number multiplexes to multiple vendors via a mobile app, with an AI agent handling first-line responses for new clients or when vendors are unavailable. Coordinators monitor service quality through real-time alerts (e.g., SLA breaches, AI escalation needs) and can intervene or assume conversations directly.

**Target Users:**
- Industrial sales teams in Mexico using WhatsApp as primary communication channel
- Field vendors requiring mobile access to client conversations and history
- Coordinators needing visibility, control, and quality assurance over sales interactions

**Problem Solved:**
- Vendor departure no longer means lost client relationships — full chat history and documents (quotes, invoices, receipts) remain in company systems
- Inconsistent service quality replaced by AI-first response with intelligent escalation
- Fragmented client data consolidated into a single company-owned repository

### What Makes This Special

**Core Insight:** The vendor is the channel, but the company owns the relationship.

SalesFlow inverts the traditional CRM model. Instead of vendors managing their own client relationships, the platform centralizes all interactions through a single business WhatsApp number. When a vendor leaves, their clients are reassigned seamlessly — complete history preserved, zero context loss.

**Differentiators:**

| Differentiator | Impact |
|---------------|-------|
| Proxy Architecture | One business number → infinite vendors, all logged and owned by the company |
| AI-First Response | New or unassigned clients receive immediate attention from RAG agent; humans handle complex cases |
| Supervisor Alerts | Coordinators receive proactive notifications (response time breaches, AI escalation needed) |
| Continuity Guarantee | Client reassignment preserves full conversation history and business documents |
| Assignment Flexibility | Round-robin or manual client assignment configurable by coordinators |

**Why Now:** Industrial sales in Mexico rely heavily on WhatsApp for client communication. Existing solutions (Salesforce, HubSpot, WhatsApp Business App) either don't own the channel or don't provide the AI/human hybrid model that makes response times competitive.

## Project Classification

| Attribute | Value |
|-----------|-------|
| **Project Type** | SaaS B2B |
| **Domain** | CRM + Communications + AI |
| **Complexity** | High |
| **Project Context** | Brownfield (existing production system) |
| **Key Concerns** | Mexico data privacy compliance (LFPDPPP), WhatsApp Business API integration, RAG agent architecture, multi-tenant isolation, AI-to-human handoff |

## Success Criteria

### User Success

**Vendedor (Mobile App)**

El vendedor considera el producto exitoso cuando:

1. **Acceso instantáneo al contexto completo** — Al abrir un chat, ve el historial completo del cliente, archivos compartidos, y etiquetas vinculadas a puntos específicos donde se encuentran documentos relevantes (cotizaciones, facturas, comprobantes).

2. **Asistencia IA dentro del chat** — Puede pedir ayuda al agente IA para buscar información dentro del historial o obtener contexto sobre lo que el cliente solicita, sin salir de la conversación.

3. **Movilidad total** — Responde desde campo, ve notificaciones en tiempo real, y gestiona múltiples clientes sin fricción.

**Coordinador (Central App)**

El coordinador considera el producto exitoso cuando:

1. **Visibilidad total** — Ve todas las conversaciones de la empresa en un solo lugar, con estados claros y filtros por vendedor, cliente, o estado.

2. **Control proactivo** — Recibe alertas cuando se superan tiempos de respuesta configurables, puede bloquear usuarios maliciosos, y tiene poder de intervención directa.

3. **Reasignación sin fricción** — Puede reasignar conversaciones agregando comentarios y contexto para el nuevo vendedor directamente en el chat, eliminando la pérdida de información en transiciones.

### Business Success

**Métricas a 3 meses:**

| Métrica | Indicador de Éxito |
|---------|-------------------|
| Incremento de ventas | Atribuible a mejor seguimiento y respuesta oportuna |
| Productividad | Más clientes atendidos por vendedor con mismo tiempo |
| Satisfacción | Clientes satisfechos con tiempos de respuesta |
| Continuidad | Cero pérdida de datos cuando vendedor sale de la empresa |
| Calidad | Sin degradación de atención en transiciones de vendedor |

**Métricas a 12 meses:**

| Métrica | Visión |
|---------|--------|
| Crecimiento | Expansión de base de usuarios activos |
| Expansión geográfica | Presencia en otros países |
| Evolución de producto | Funcionalidades avanzadas de IA implementadas |

**Métrica clave de éxito:** Aumento de clientes interesados en adquirir la aplicación y retención de los mismos.

### Technical Success

| Criterio | Requisito |
|----------|-----------|
| Disponibilidad | 99.5% uptime mínimo para operación comercial |
| Latencia de respuesta | < 3 segundos para mensajes en flujo normal |
| Handoff IA → Humano | Transición transparente sin pérdida de contexto |
| Persistencia | 100% de historial y documentos preservados |
| Multi-tenancy | Aislamiento total de datos entre compañías |
| WhatsApp API | Integración estable con webhooks confiables |

### Measurable Outcomes

**User Success Metrics:**

- Tiempo promedio para encontrar documento en historial < 30 segundos
- Tiempo promedio de respuesta a cliente < tiempo configurado en SLA
- Satisfacción del vendedor con la herramienta (NPS) > 50

**Business Success Metrics:**

- Tasa de adquisición de nuevos clientes (mes a mes)
- Tasa de retención de clientes existentes (>90%)
- Tiempo promedio desde demo hasta cierre de venta

**Technical Success Metrics:**

- Uptime real vs. SLA
- Tiempo de handoff IA → Humano
- Tiempo de recuperación ante fallos

## Product Scope

### MVP - Minimum Viable Product

El MVP incluye todas las características definidas hasta hoy como esenciales para la primera salida a mercado:

**Core Platform:**
- Proxy WhatsApp Business → múltiples vendedores
- Agente IA con RAG para respuestas automáticas
- Handoff IA → Humano con alertas al coordinador
- App móvil para vendedores
- App central para coordinadores
- Historial completo de conversaciones y documentos
- Etiquetas vinculadas a puntos del chat
- Asistencia IA dentro del chat (búsqueda)
- Reasignación de clientes con contexto
- Bloqueo de usuarios maliciosos

**Multi-tenant:**
- Aislamiento de datos por compañía
- Roles: Admin, Coordinador, Vendedor
- Configuración de tiempos de respuesta (SLA)

### Growth Features (Post-MVP)

**Funcionalidades para versión Growth:**
- Analytics avanzados de conversaciones
- Dashboard de productividad por vendedor
- Templates de respuestas rápidas
- Integración con CRM externo
- Reportes automatizados
- Métricas de satisfacción de clientes

### Vision (Future)

**Funcionalidades de visión:**
- IA conversacional avanzada con más capacidades
- Integración con otros canales (Instagram, Facebook Messenger)
- Análisis predictivo de ventas
- Expansión a otros países y mercados
- APIs públicas para integraciones

## User Journeys

### Journey 1: Roberto - Vendedor de Campo

**Persona:** Roberto, 38 años, vendedor de suministros industriales en Monterrey. 40 clientes activos, 8 años en la empresa. Usa WhatsApp como canal principal de comunicación.

**Situación Inicial (El Dolor):**
Roberto regresa de vacaciones. Cambió de teléfono hace una semana y perdió todo el historial de sus clientes. Su compañero Carlos, quien lo suplió, sale de vacaciones justo hoy. Roberto no sabe qué conversaciones tuvo Carlos con sus clientes, qué cotizaciones enviaron, ni qué promesas hicieron. Los clientes esperan continuidad, pero Roberto está a ciegas.

**El Momento "Wow":**
Roberto abre SalesFlow y ve que le asignaron 3 clientes nuevos mientras estaba fuera. Al entrar al primer chat, encuentra:
- El historial completo de la conversación con Carlos
- Etiquetas vinculadas a cotizaciones enviadas (cot-452, cot-453)
- Un comentario del coordinador: "Cliente interesado en el modelo X-200, espera precio especial"

Roberto respira. Tiene contexto. Puede responder con confianza.

**Journey Típico:**

| Hora | Acción | Valor |
|------|--------|-------|
| 8:00 AM | Abre app, revisa pendientes de ayer | Organización del día |
| 8:15 AM | Notificación sonora - cliente nuevo asignado | Alerta inmediata |
| 8:20 AM | Revisa historial del cliente nuevo | Contexto antes de responder |
| 8:30 AM | Usa etiquetas para encontrar cotización enviada | Búsqueda en segundos |
| 10:00 AM | Cliente pregunta por especificación técnica | Necesita información rápida |
| 10:01 AM | Roberto consulta al Agente IA en el chat: "¿Cuáles son las specs del X-200?" | IA responde con info del RAG |
| 12:00 PM | Coordinador interviene con comentario en chat | Apoyo sin fricción |
| 3:00 PM | Cliente recurrente pregunta por pedido anterior | Búsqueda en historial |
| 3:01 PM | Roberto busca etiqueta "factura" y responde en 30 seg | Historial accesible |

### Journey 2: María - Coordinadora de Ventas

**Persona:** María, 42 años, coordinadora de ventas de suministros industriales. 8 vendedores a su cargo. Responsable de productividad del equipo y calidad de atención al cliente.

**Situación Inicial (El Dolor):**
María gestiona su equipo con información fragmentada. Solo ve el resultado final (cotizaciones y facturas en el sistema administrativo), pero el proceso de venta es una caja negra. No sabe:
- ¿Los vendedores responden a tiempo?
- ¿El trato es profesional?
- ¿Hay seguimiento activo a cada cotización?
- ¿Las cargas de trabajo están balanceadas?

Se entera de los problemas cuando llega una queja: "El vendedor tardó 3 días en responder" o "No me explicó bien las condiciones". Ya es tarde, el cliente está frustrado.

**El Momento "Wow":**
María abre el dashboard de SalesFlow y ve:
- Panel de chats activos (último mensaje en los últimos 30 min)
- Métricas en tiempo real: interacciones por vendedor, tiempo promedio, ratio cotización/venta
- Una alerta roja: "Chat #234 superó SLA de 2 minutos"

Por primera vez, tiene transparencia total. Puede intervenir antes de que sea una queja. Puede balancear cargas con datos. Puede ver el profesionalismo de su equipo.

**Journey Típico:**

| Hora | Acción | Valor |
|------|--------|-------|
| 7:30 AM | Revisa conversaciones atendidas por IA fuera de horario | Visión nocturna |
| 7:45 AM | Revisa estatus de peticiones fuera de horario | Pendientes identificados |
| 8:00 AM | Abre panel de chats activos | Monitoreo en tiempo real |
| 10:30 AM | Alerta SLA: vendedor Carlos no ha respondido en 3 min | Detección proactiva |
| 10:31 AM | María entra al chat #234 y responde al cliente directamente | Atención inmediata |
| 10:32 AM | María deja comentario en el mismo chat para Carlos: "Ya respondí, cotiza el modelo X-200" | Intervención inmersiva |
| 12:00 PM | Revisa dashboard de productividad por vendedor | Métricas objetivas |
| 3:00 PM | Detecta desbalance: Roberto tiene 15 chats, Ana tiene 5 | Reasignación informada |
| 5:00 PM | Configura nuevo SLA: respuesta máxima 90 segundos | Control de parámetros |

### Journey 3: El Cliente - Comprador Industrial

**Persona:** Alejandro, 35 años, jefe de Compras de una empresa manufacturera. Necesita insumos industriales urgentes o cotizaciones para presupuestos. Usa WhatsApp porque es inmediato y ya está en su día a día.

**Tipos de Cliente:**
| Tipo | Definición | Asignación |
|------|------------|------------|
| **Nuevo** | Primera interacción con la empresa | IA atiende, se clasifica al final |
| **Recurrente** | Identificado explícitamente por coordinador | Asignado a vendedor específico |
| **Esporádico** | No identificado como recurrente | Auto-asignado vía round-robin |

**Situación Inicial (El Dolor):**
Alejandro escribe a las 11pm a una empresa de suministros. En otras empresas, su mensaje queda "en visto" hasta el día siguiente. O peor: habla con un vendedor que no recuerda nada de su última compra, le pide repetir toda la información, y él piensa: "¿No tenían registro de esto?"

**El Momento "Wow":**
Alejandro manda un mensaje a las 11pm. En segundos, recibe respuesta:
> "¡Hola! Soy el asistente virtual de Suministros del Norte. Puedo ayudarte con información de productos. ¿Qué necesitas?"

La IA le muestra opciones, fotos, especificaciones. Le ofrece agendar una llamada para mañana. Alejandro se siente escuchado.

Días después, el vendedor asignado le responde y ya sabe lo que Alejandro necesita. No le pide repetir nada. La cotización llega en minutos, no días.

**Modos de Operación del Agente IA:**

| Modo | Horario | Comportamiento |
|------|---------|----------------|
| **Fuera de horario** | Nocturno/fines de semana | Se identifica como IA, ofrece información de productos, agenda callbacks, toma datos de contacto |
| **Dentro de horario** | Laboral | No se identifica como IA, da información, coordinador puede intervenir y asignar a vendedor |

**Journey Típico - Cliente Nuevo Fuera de Horario:**

| Tiempo | Acción | Experiencia |
|--------|--------|-------------|
| 11:00 PM | Cliente envía mensaje: "Necesito válvulas de presión" | Iniciativa del cliente |
| 11:00 PM | IA responde en segundos: "¡Hola! Soy el asistente virtual..." | Atención inmediata |
| 11:02 PM | IA muestra catálogo: modelos, fotos, specs | Información visual |
| 11:05 PM | IA ofrece: "¿Te gustaría que te llamen mañana a las 9am?" | Agendamiento |
| 9:00 AM | Vendedor asignado ve historial completo, llama a Alejandro | Handoff sin fricción |
| 9:05 AM | Vendedor: "Alejandro, vi que preguntaste por las válvulas V-200..." | Contexto preservado |

**Journey Típico - Cliente Recurrente:**

| Tiempo | Acción | Experiencia |
|--------|--------|-------------|
| 10:00 AM | Cliente envía: "¿Tienen la factura de mi pedido del mes pasado?" | Consulta |
| 10:00 AM | Vendedor Roberto ve notificación | Alerta sonora |
| 10:01 AM | Roberto busca etiqueta "factura" en el chat, encuentra en 5 segundos | Búsqueda instantánea |
| 10:02 AM | Roberto responde con el documento | Respuesta en 2 min |

### Journey 4: Admin - Configurador Técnico

**Persona:** Admin, 30-45 años, habilidades técnicas. Responsable de la configuración inicial de la empresa en SalesFlow. Puede ser un rol separado o el mismo coordinador con permisos extendidos.

**Situación Inicial (El Dolor):**
Una empresa industrial quiere implementar SalesFlow. El Admin necesita configurar todo para que el sistema funcione: integración con WhatsApp Business, el agente IA con conocimiento de productos, y los usuarios del equipo. Sin una configuración clara, el sistema no puede operar.

**El Momento "Wow":**
El Admin completa el onboarding en menos de 30 minutos:
- Empresa creada
- Coordinador dado de alta
- API keys configuradas (IA y WhatsApp)
- RAG cargado con catálogo de productos

El sistema está listo. Los vendedores pueden empezar a atender clientes.

**Journey de Onboarding:**

| Paso | Acción | Resultado |
|------|--------|-----------|
| 1 | Alta de empresa | Tenant creado en sistema multi-tenant |
| 2 | Alta de coordinador (mínimo 1) | Usuario con rol de coordinador creado |
| 3 | Configuración IA API key (opcional) | Agente IA habilitado si se proporciona key |
| 4 | Configuración WhatsApp Business API key (requerido) | Canal de comunicación activo |
| 5 | Configuración RAG (si IA habilitada) | Base de conocimiento cargada con productos, precios, specs |

**Journey de Gestión Continua:**

| Acción | Frecuencia | Propósito |
|--------|------------|-----------|
| Alta/baja de usuarios (coordinadores, vendedores) | Según necesidad | Gestión del equipo |
| Actualización de cuentas | Según necesidad | Mantener datos actualizados |
| Configuración de plantillas de respuestas rápidas | Ocasional | Estandarizar comunicación |
| Respaldos de datos | Periódico | Seguridad de información |
| Configuración de datos de empresa | Según necesidad | Información fiscal, contacto |

### Journey Requirements Summary

Los journeys revelan las siguientes áreas de capacidades:

| Journey | Capacidades Clave |
|---------|-------------------|
| **Vendedor** | Historial persistente, etiquetas, búsqueda, IA en chat, notificaciones push |
| **Coordinador** | Dashboard, métricas, alertas SLA, intervención inmersiva, reasignación |
| **Cliente** | Respuesta 24/7, clasificación, handoff IA→Humano, contexto preservado |
| **Admin** | Multi-tenant, API integrations, RAG config, gestión de usuarios |

## Domain-Specific Requirements

### Compliance & Regulatory

**LFPDPPP (México) - Ley Federal de Protección de Datos Personales:**

| Requisito | Implementación |
|-----------|----------------|
| Aviso de privacidad | Gestionado externamente - referenciado en cotizaciones y documentos empresariales |
| Solicitudes ARCO | Protocolo disponible en página web de la empresa (fuera del sistema) |
| Consentimiento | Implícito al interactuar con la empresa a través de documentos empresariales |

**WhatsApp Business API:**

| Requisito | Implementación |
|-----------|----------------|
| Identificación de negocio | WhatsApp muestra etiqueta automática "empresa" - no requiere mención adicional |
| Opt-out / Des-suscripción | Link de des-suscripción disponible para clientes |
| Restricciones de contenido | Sin restricciones específicas de contenido |

**AI Data Handling:**

| Requisito | Implementación |
|-----------|----------------|
| Datos accesibles a IA | Contacto del cliente + requerimientos de productos mencionados en chat |
| Uso para entrenamiento | ❌ Los datos NO se utilizan para entrenar el modelo |
| Información sensible | No pasa por IA (políticas internas de la empresa) |

### Technical Constraints

**Multi-Tenant Architecture:**

| Requisito | Detalle |
|-----------|---------|
| Aislamiento de datos | Separación completa de datos entre empresas (tenants) |
| Separación de conversaciones | Cada empresa solo accede a sus propios chats y clientes |
| Separación de RAG | Base de conocimiento por empresa (productos, precios, specs) |

**WhatsApp Business API:**

| Requisito | Estado |
|-----------|--------|
| Cuenta de negocio | ✅ Aprobada |
| Número verificado | ✅ Verificado |
| Template de mensajes inicial | Sin restricciones |
| Rate limits | Considerar límites de Meta en diseño |

**Real-Time Messaging:**

| Requisito | Target |
|-----------|--------|
| Latencia de mensajes | Tiempo real para flujo normal (< 3 segundos) |
| Notificaciones push | Inmediatas para vendedores |
| Alertas SLA | Configurables por empresa |

### Integration Requirements

**WhatsApp Business API:**

| Aspecto | Detalle |
|---------|---------|
| Webhooks | Recepción de mensajes entrantes |
| Send API | Envío de mensajes salientes |
| Media API | Manejo de imágenes, documentos |
| Business Profile | Información de empresa visible para clientes |

**AI/LLM Provider:**

| Aspecto | Detalle |
|---------|---------|
| Proveedores considerados | Anthropic, OpenAI, GoogleAI, DeepSeek u otros |
| Criterios de selección | Presupuesto aprobado por área interna |
| Latencia | Sin requisitos específicos |
| Fallback | Tolerancia a latencia variable |

**Mobile Push Notifications:**

| Aspecto | Detalle |
|---------|---------|
| Plataformas | iOS y Android |
| Tipo | Notificaciones sonoras para nuevos mensajes |
| Target | App móvil de vendedores |

### Risk Mitigations

| Riesgo | Mitigación |
|--------|------------|
| **Rate limiting de WhatsApp** | Diseño con backoff exponencial, cola de mensajes, monitoreo de límites |
| **Falla del proveedor de IA** | Fallback a respuesta humana, monitoreo de disponibilidad |
| **Alucinación de IA** | Limitar respuestas a información del RAG, log de conversaciones para auditoría |
| **Pérdida de datos** | Respaldos periódicos, base de datos replicada |
| **Brecha de privacidad** | Aislamiento multi-tenant, logs de acceso, encriptación en reposo |
| **Dependencia de WhatsApp** | Arquitectura preparada para multi-canal futuro (Instagram, Messenger) |

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (WhatsApp)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WHATSAPP BUSINESS API                        │
│                    (Webhooks + Send API)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SALESFLOW BACKEND                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Router    │  │  AI Agent   │  │   RAG       │             │
│  │  (Proxy)    │  │  (LLM API)  │  │ (Knowledge) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Message    │  │   Tenant    │  │   Push      │             │
│  │  Queue      │  │  Isolation  │  │  Service    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    APP COORDINADOR      │     │    APP VENDEDOR         │
│    (Central/Web)        │     │    (Mobile)             │
│  • Dashboard            │     │  • Chats asignados      │
│  • Métricas             │     │  • Historial            │
│  • Intervención        │     │  • Notificaciones push  │
│  • Configuración       │     │  • IA assistance        │
└─────────────────────────┘     └─────────────────────────┘
```

## SaaS B2B Specific Requirements

### Multi-Tenant Architecture

**Deployment Model: Instance Isolation**

SalesFlow implementa un modelo de aislamiento total por empresa. Cada tenant obtiene su propia instancia desplegada:

| Componente | Aislamiento |
|------------|-------------|
| Base de datos | Separada por tenant |
| Dominio | Dedicado por empresa (ej: `empresa.salesflow.app`) |
| Infraestructura | Sin recursos compartidos entre tenants |

**Beneficios del modelo:**
- Seguridad máxima: datos completamente segregados
- Independencia: actualizaciones sin afectar otros tenants
- Escalabilidad: recursos dedicados por cliente
- Compliance: facilita auditorías y requisitos regulatorios

**Consideraciones de implementación:**
- Onboarding automatizado de nuevas instancias
- Monitoreo individual por tenant
- Backup y recuperación independientes
- Despliegue de actualizaciones por fases (staggered rollout)

### Role-Based Access Control (RBAC)

**Matriz de Permisos:**

| Acción | Admin | Coordinador | Vendedor |
|--------|:-----:|:-----------:|:--------:|
| Crear/eliminar usuarios | ✅ Todos | ⚠️ Solo vendedores | ❌ |
| Ver todos los chats | ✅ | ✅ | ❌ Solo asignados |
| Reasignar clientes | ✅ | ✅ | ❌ |
| Configurar IA y WhatsApp API | ✅ | ❌ | ❌ |
| Bloquear usuarios maliciosos | ✅ | ✅ | ❌ |
| Ver métricas y dashboards | ✅ | ✅ | ❌ |
| Responder mensajes | ✅ | ✅ | ✅ Solo asignados |
| Acceder historial completo | ✅ | ✅ | ✅ Solo asignados |

**Definición de Roles:**

- **Admin:** Control total de la instancia. Gestiona configuración de integraciones (IA, WhatsApp), usuarios de cualquier rol, y puede realizar todas las acciones del sistema.

- **Coordinador:** Gestiona el equipo de ventas. Puede crear vendedores, supervisar conversaciones, reasignar clientes, bloquear usuarios maliciosos, y acceder a métricas. No tiene acceso a configuración de integraciones.

- **Vendedor:** Atiende clientes asignados. Puede responder mensajes, acceder al historial de sus clientes, y recibir asistencia IA dentro del chat. No puede ver chats de otros vendedores ni acceder a métricas.

### Subscription Model

**MVP Launch: Plan Único**

El producto lanza con un modelo de plan único que incluye todas las funcionalidades core:

- Proxy WhatsApp Business → múltiples vendedores
- Agente IA con RAG
- App móvil para vendedores
- App central para coordinadores
- Historial completo y etiquetas
- Reasignación de clientes
- Bloqueo de usuarios

**Evolución Futura:**

Los tiers de suscripción se evaluarán post-lanzamiento basados en:
- Retroalimentación del mercado
- Patrones de uso observados
- Requisitos de escalabilidad por tamaño de empresa
- Competencia y posicionamiento de mercado

**Posibles dimensiones para tiers futuros:**
- Número de vendedores activos
- Volumen de conversaciones mensuales
- Capacidades avanzadas de IA
- Integraciones con CRM externos

### Implementation Considerations

**Onboarding de Nuevos Tenants:**

1. **Provisioning:** Creación de instancia dedicada (BD, dominio, infraestructura)
2. **Configuración Admin:** Alta del usuario administrador
3. **Integraciones:** Configuración de API keys (WhatsApp, IA)
4. **RAG Setup:** Carga de base de conocimiento (productos, precios, especificaciones)
5. **Usuarios:** Alta de coordinadores y vendedores por parte del Admin

**Escalabilidad:**

- Cada instancia escala independientemente
- Recursos dedicados evitan "noisy neighbor" issues
- Actualizaciones pueden aplicarse por fases

**Monitoreo y Soporte:**

- Health checks por tenant
- Métricas de uso aisladas por empresa
- Logs segregados para auditoría

_Nota: Integration Requirements y Compliance Requirements están documentados en la sección Domain-Specific Requirements._

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — Resolver el problema core de propiedad de la relación cliente-empresa con supervisión empresarial del canal WhatsApp.

**Resource Requirements:** Equipo de 5 desarrolladores tiempo completo + asistencia IA para generación de código.

**Timeline:** 12 semanas (3 meses) para MVP en producción.

**Metodología:** Scrum con entregas por épicas, siguiendo Definition of Done del proyecto:
- Tests generados junto con código (no añadidos después)
- Documentación en paralelo (JSDoc frontend, Swagger backend)
- Lint passing, sin console.log residual
- AC 100% cumplidos por épica

### Development Timeline by Phase

#### Fase 1: Foundation (Semanas 1-3)

**Backend:**
- Auth + Multi-tenant architecture
- Database schema + ORM setup
- Base API structure
- WhatsApp Business Integration básica

**Frontend/Mobile:**
- Setup proyectos (React + Vite, React Native)
- Componentes base y diseño system
- Coordinator App: Layout, Autenticación, Dashboard inicial

**Definition of Done por Épica:**
- Unit tests + Integration tests passing
- Swagger/JSDoc documentation complete
- Lint passing, no console.log

#### Fase 2: Core Features (Semanas 4-8)

**Backend:**
- IA Provider Integration + RAG setup
- Push Notifications (iOS + Android)
- Handoff IA → Humano logic
- Alertas SLA + Reasignación + Bloqueo

**Frontend/Mobile:**
- Coordinator App: Chats, Intervención, Métricas, Configuración
- Vendor App: Chats, Historial, Etiquetas, IA Assistance
- Push notifications en tiempo real

**Definition of Done por Épica:**
- Tests passing (todos, sin skip)
- Documentación actualizada
- Code review aprobado

#### Fase 3: Polish & Testing (Semanas 9-12)

**Semana 9-10: Integration Testing**
- Pruebas de integración end-to-end
- Bug fixes y edge cases
- Performance optimization

**Semana 11: UAT Beta Controlado**
- Despliegue con 1-2 empresas piloto
- Feedback de usuarios reales
- Ajustes de UX

**Semana 12: Producción**
- Ajustes finales de UAT
- Deploy a producción
- Monitoreo inicial

### MVP Feature Set (Phase 1)

**Core User Journeys Soportados:**

| Journey | Features MVP |
|---------|-------------|
| Vendedor (Roberto) | App móvil, chats asignados, historial, etiquetas, asistencia IA en chat, notificaciones push |
| Coordinador (María) | App web, dashboard, todos los chats, métricas, alertas SLA, intervención directa, reasignación, bloqueo |
| Cliente (Alejandro) | Respuesta IA 24/7, handoff a humano, historial preservado |
| Admin | Onboarding, gestión de usuarios, configuración IA + WhatsApp |

**Must-Have Capabilities:**

| Categoría | Features |
|-----------|----------|
| **Core Platform** | Proxy WhatsApp Business → múltiples vendedores |
| **IA** | Agente RAG para respuestas automáticas + asistencia en chat |
| **Mobile App** | React Native para vendedores (iOS + Android) |
| **Web App** | React para coordinadores |
| **Historial** | Conversaciones y documentos preservados |
| **Etiquetas** | Clasificación de puntos en el chat |
| **Gestión** | Reasignación de clientes, bloqueo de usuarios |
| **Multi-tenant** | Aislamiento total por empresa |

**Definition of Done (MVP):**

- ✅ Feature implementada según AC
- ✅ Tests generados junto con código
- ✅ Documentación JSDoc/Swagger en paralelo
- ✅ Lint passing
- ✅ Sin console.log/debug code residual
- ✅ README actualizado (solo si aplica)

### Post-MVP Features

**Phase 2 (Growth) - Semanas 13-20:**

| Feature | Descripción |
|---------|-------------|
| Analytics avanzados | Dashboard de métricas de conversaciones |
| Productividad por vendedor | Reportes de rendimiento individual |
| Templates de respuestas | Atajos "/" para mensajes frecuentes |
| Integración CRM | Salesforce, HubSpot u otros |
| Reportes automatizados | Envío programado de métricas |
| Métricas de satisfacción | NPS y feedback de clientes |

**Phase 3 (Vision) - Post-mes 5:**

| Feature | Descripción |
|---------|-------------|
| IA conversacional avanzada | Más capacidades de comprensión |
| Multi-canal | Instagram, Facebook Messenger |
| Análisis predictivo | Predicción de ventas |
| Expansión geográfica | Otros países |
| APIs públicas | Integraciones de terceros |

### Risk Mitigation Strategy

**Riesgo Técnico:** ✅ Bajo
- WhatsApp Business API ya aprobada y verificada
- Proveedores de IA establecidos (Anthropic, OpenAI, etc.)
- Equipo con experiencia en stack (React, Node.js)

**Riesgo de Mercado:** ✅ Mitigado
- Adopción por política empresarial (no opcional)
- Incentivo claro: IA assistant para búsqueda de documentos
- Sin resistencia al cambio anticipada

**Riesgo de Recursos:** ✅ Gestionado
- Equipo de 5 personas tiempo completo
- IA assistance para acelerar desarrollo
- Timeline de 12 semanas aprobado

### Scrum Alignment

**Sprint Duration:** 2 semanas (recomendado por project-context)

**Ceremonias:**
- Daily Standup
- Sprint Planning
- Sprint Review
- Retrospective

**Entregables por Épica:**
- Código + Tests + Documentación (no secuencial)
- AC 100% cumplidos antes de cerrar épica
- Demo al final de cada sprint

**Definition of Ready (DoR):**
- AC definidos y claros
- Diseño revisado
- Dependencias resueltas
- Estimada por el equipo

### Team Distribution

| Rol | Responsabilidad | Paralelización |
|-----|-----------------|----------------|
| Dev 1 | Backend Core + Auth | Independiente |
| Dev 2 | WhatsApp Integration + Webhooks | Con Dev 1 |
| Dev 3 | IA/RAG Integration + Push | Con Dev 1, Dev 2 |
| Dev 4 | Coordinator App (Web React) | Con Dev 5 |
| Dev 5 | Vendor App (Mobile React Native) | Con Dev 4 |

### Milestones

| Hito | Semana | Criterio |
|------|--------|----------|
| **Alpha Interno** | 8 | Features core funcionando, testing interno |
| **Beta Controlado** | 10 | 1-2 empresas piloto usando el sistema |
| **MVP Producción** | 12 | Lanzamiento oficial, monitoreo activo |

## Functional Requirements

### 1. User Management & Authentication

- **FR1:** Admin can create, edit, and deactivate users within their tenant
- **FR2:** Coordinator can create and deactivate vendor users only
- **FR3:** Users can authenticate with email/password and receive role-based access
- **FR4:** Admin can configure company profile and branding
- **FR5:** System enforces role-based permissions according to RBAC matrix

### 2. Conversation Management

- **FR6:** Vendor can view all conversations assigned to them
- **FR7:** Vendor can access complete conversation history with any assigned client
- **FR8:** Vendor can search within conversation history by keyword or tag
- **FR9:** Vendor can attach tags to specific points in a conversation
- **FR10:** Coordinator can view all conversations across all vendors
- **FR11:** Coordinator can add comments to any conversation for context
- **FR12:** System preserves complete conversation history regardless of vendor reassignment

### 3. AI Agent & RAG

- **FR13:** System automatically responds to new client messages via AI agent
- **FR14:** AI agent retrieves product information from RAG knowledge base
- **FR15:** System identifies when AI cannot handle a request and escalates to human
- **FR16:** Vendor can request AI assistance within a conversation to find information
- **FR17:** Coordinator receives alerts when AI escalates or needs human intervention
- **FR18:** AI operates in off-hours mode with self-identification and callback scheduling

### 4. Client Assignment & Routing

- **FR19:** Admin can configure client assignment rules (manual or round-robin)
- **FR20:** Coordinator can manually reassign clients to any vendor
- **FR21:** System preserves context and comments when client is reassigned
- **FR22:** Coordinator can block malicious or unwanted client users
- **FR23:** System automatically assigns new clients based on configured rules

### 5. Supervision & Control

- **FR24:** Coordinator can configure SLA response time thresholds
- **FR25:** Coordinator receives real-time alerts when SLA thresholds are exceeded
- **FR26:** Coordinator can intervene and respond directly to any client conversation
- **FR27:** Coordinator can view productivity metrics by vendor (response time, conversations, conversions)
- **FR28:** Admin can generate usage and activity reports for their tenant

### 6. Mobile Experience

- **FR29:** Vendor can receive push notifications for new messages on mobile devices (iOS and Android)
- **FR30:** Vendor can respond to client messages through mobile app with full conversation history
- **FR31:** Vendor can access AI assistant from mobile app within conversations

### 7. Multi-Tenant Administration

- **FR32:** System provisions isolated instance (database, domain, infrastructure) for each new company
- **FR33:** Admin can configure WhatsApp Business API credentials for their tenant
- **FR34:** Admin can configure AI provider API keys for their tenant
- **FR35:** Admin can upload and manage RAG knowledge base content (products, prices, specifications)

### 8. Integrations & External Systems

- **FR36:** System receives messages from WhatsApp Business API via webhooks
- **FR37:** System sends messages to clients through WhatsApp Business API
- **FR38:** System handles media attachments (images, documents) in conversations

**UX Design Reference:** UI design decisions from brainstorming session (`_bmad-output/brainstorming/brainstorming-session-2026-03-28-ui-design.md`) will be formalized in the UX Design Document following this PRD.

## Non-Functional Requirements

### Performance

| ID | Requisito | Métrica | Contexto |
|----|-----------|---------|----------|
| **NFR1** | Tiempo de respuesta de mensajes | < 3 segundos | Flujo normal de conversación |
| **NFR2** | Latencia de push notifications | < 5 segundos | Desde recepción en servidor hasta dispositivo móvil |
| **NFR3** | Tiempo de respuesta IA | < 5 segundos | Generación de respuesta con RAG |
| **NFR4** | Búsqueda en historial | < 2 segundos | Para conversaciones con 1000+ mensajes |
| **NFR5** | Tiempo de handoff IA → Humano | < 1 segundo | Transición transparente sin pérdida de contexto |

### Security

| ID | Requisito | Métrica | Contexto |
|----|-----------|---------|----------|
| **NFR6** | Encriptación en tránsito | TLS 1.3 | Todas las comunicaciones cliente-servidor |
| **NFR7** | Encriptación en reposo | AES-256 | Base de datos y archivos de documentos |
| **NFR8** | Aislamiento de datos por tenant | 100% segregación | Sin acceso cruzado entre empresas |
| **NFR9** | Autenticación de usuarios | JWT con expiración 24h | Sesiones con renovación automática |
| **NFR10** | Auditoría de accesos | Log completo | Quién accedió qué datos y cuándo |
| **NFR11** | Cumplimiento LFPDPPP | México | Datos de clientes protegidos según legislación local |

### Scalability

| ID | Requisito | Métrica | Contexto |
|----|-----------|---------|----------|
| **NFR12** | Instancias por tenant | 1 dedicada | Aislamiento total por empresa |
| **NFR13** | Escalabilidad horizontal | Por instancia | Cada tenant escala independientemente |
| **NFR14** | Mensajes concurrentes | 100 por instancia | Soporte inicial por tenant |
| **NFR15** | Crecimiento sin degradación | < 10% performance loss | Al escalar de 10 a 100 usuarios |

### Integration

| ID | Requisito | Métrica | Contexto |
|----|-----------|---------|----------|
| **NFR16** | WhatsApp API uptime | 99.5% | Depende de Meta, monitoreo activo |
| **NFR17** | Fallback de IA | Respuesta humana | Si proveedor IA no disponible |
| **NFR18** | Rate limiting WhatsApp | Backoff exponencial | Manejo de límites de Meta |
| **NFR19** | Formatos de media soportados | JPG, PNG, PDF, DOCX | Imágenes y documentos |

### Reliability

| ID | Requisito | Métrica | Contexto |
|----|-----------|---------|----------|
| **NFR20** | Uptime del sistema | 99.5% | Operación comercial continua |
| **NFR21** | Recuperación ante fallos | < 5 minutos | Restauración de servicio |
| **NFR22** | Backup de datos | Diario | Sin pérdida de historial |
| **NFR23** | Persistencia de historial | 100% | Nunca perder conversaciones ni documentos |

### NFR Summary

| Categoría | Cantidad | Justificación |
|-----------|----------|---------------|
| Performance | 5 | Mensajería en tiempo real crítica |
| Security | 6 | Multi-tenant + datos sensibles + compliance |
| Scalability | 4 | Crecimiento por fases + instancias dedicadas |
| Integration | 4 | WhatsApp + IA + Push dependencies |
| Reliability | 4 | SLA comercial + continuidad de datos |
| Accessibility | 0 | Uso obligatorio, herramientas nativas del SO |
