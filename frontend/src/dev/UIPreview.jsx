/**
 * Dev-only kitchen sink at /__ui. Renders the design system and the main chat
 * surfaces with mock data so UI can be reviewed without a backend.
 * Excluded from production builds (see App.jsx).
 */
import { useEffect, useState } from 'react';
import { Bell, Plus, Search, Trash2, ShoppingCart } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore.js';
import useChatStore from '../stores/useChatStore.js';
import { toast } from '../stores/useToastStore.js';
import Sidebar from '../components/layout/Sidebar.jsx';
import Header from '../components/layout/Header.jsx';
import ChatList from '../features/chat/components/ChatList.jsx';
import MessageList from '../features/chat/components/MessageList.jsx';
import CatalogPanel from '../features/chat/components/CatalogPanel.jsx';
import CoordinatorDashboard from '../features/chat/components/CoordinatorDashboard.jsx';
import Settings from '../pages/Settings.jsx';
import UserListPage from '../features/users/UserListPage.jsx';
import Clients from '../pages/Clients.jsx';
import History from '../pages/History.jsx';
import Metrics from '../pages/Metrics.jsx';
import SearchPage from '../pages/SearchPage.jsx';
import CartViewer from '../features/chat/components/CartViewer.jsx';
import CommandPalette from '../features/chat/components/CommandPalette.jsx';
import useUIStore from '../stores/useUIStore.js';
import { Button, IconButton, Badge, StatusPill, Eyebrow, Modal, EmptyState, Panel, Avatar, Tabs, Field, Input, Select, Textarea, Switch, Kbd, Toaster, PageHeader } from '../components/ui/index.js';

const now = Date.now();
const ago = (min) => new Date(now - min * 60000).toISOString();

const MOCK_USER = { id: 'u1', name: 'Luis Martínez', email: 'luis@sellos.mx', role: 'VENDOR', tenantName: 'Sellos Hidráulicos del Norte', tenantId: 't1' };

const client1 = {
  id: 'c1',
  name: 'Carolina Camarena',
  phoneNumber: '+52 844 123 4567',
  cartData: {
    items: [
      { clave: 'PS-PTB05006060P', descripcion: 'Sello vástago 50×60×6', precio: 229, cantidad: 2 },
      { clave: 'PK-0500', descripcion: 'Kit empaques pistón 50', precio: 612, cantidad: 1 },
    ],
    shippingAddress: 'Blvd. Venustiano Carranza 2400, Saltillo, Coah.',
  },
};

const MOCK_CONVERSATIONS = [
  { id: 'cv1', client: client1, status: 'PENDING_ASSIGNMENT', aiPendingEscalation: true, lastMessageAt: ago(2), createdAt: ago(40), messages: [{ content: '¿Me podrían incluir también el kit de empaques del pistón?' }], aiSummary: '2 × Sello vástago PTB 50×60×6 SKF · $458.00 · Datos fiscales validados (CSF) · Envío a Saltillo, Coah.' },
  { id: 'cv2', client: { id: 'c2', name: 'Refacciones del Norte' }, status: 'ACTIVE', vendorId: 'u1', lastMessageAt: ago(15), createdAt: ago(300), messages: [{ content: '¿Tienen el kit completo?' }] },
  { id: 'cv3', client: { id: 'c3', name: 'Hidráulica Saltillo' }, status: 'PENDING_ASSIGNMENT', lastMessageAt: ago(35), createdAt: ago(35), messages: [{ content: 'Buscando sello 40×52×7…' }] },
  { id: 'cv4', client: { id: 'c4', name: 'Maquinaria Pesada MX' }, status: 'ESCALATED', vendorId: 'u2', isSlaBreached: true, breachType: 'response', lastMessageAt: ago(95), createdAt: ago(600), messages: [{ content: 'Llevo una hora esperando la cotización.' }] },
  { id: 'cv5', client: { id: 'c5', phoneNumber: '+52 871 555 0199' }, status: 'WAITING_CUSTOMER', vendorId: 'u1', lastMessageAt: ago(180), createdAt: ago(900), messages: [{ content: 'Te envío la cotización actualizada en PDF.' }] },
  { id: 'cv6', client: { id: 'c6', name: 'Talleres Unidos' }, status: 'SCHEDULED', vendorId: 'u1', lastMessageAt: ago(1500), createdAt: ago(3000), messages: [{ content: 'Perfecto, hablamos el lunes.' }] },
  { id: 'cv7', client: { id: 'c7', name: 'Grúas y Montacargas SA' }, status: 'CLOSED_WON', vendorId: 'u1', lastMessageAt: ago(2900), createdAt: ago(4000), messages: [{ content: 'Pago confirmado, gracias.' }] },
];

const MOCK_MESSAGES = [
  { id: 'm1', senderType: 'CUSTOMER', content: 'Hola, necesito 2 sellos de vástago PTB 50×60×6 marca SKF.', createdAt: ago(1500) },
  { id: 'm2', senderType: 'IA', content: 'Claro, con gusto. Tengo disponible el *PS-PTB05006060P* a $229.00 c/u. ¿Deseas que lo agregue a tu cotización?', createdAt: ago(1498) },
  { id: 'm3', senderType: 'CUSTOMER', content: 'Sí, por favor. También necesito factura.', createdAt: ago(1490) },
  { id: 'm4', senderType: 'VENDOR', isInternal: true, sender: { name: 'Luis', role: 'VENDOR' }, content: 'Pide descuento por volumen, 20 pzas del PTB 50×60. ¿Puedo ofrecer 8%?', createdAt: ago(60) },
  { id: 'm5', senderType: 'COORDINATOR', isInternal: true, sender: { name: 'Rocío', role: 'COORDINATOR' }, content: 'Autorizado hasta 10% si confirma hoy. Te adjunto la ficha por si pregunta por el material.', createdAt: ago(55) },
  { id: 'm6', senderType: 'CUSTOMER', content: '¿Me podrían incluir también el kit de empaques del pistón?', createdAt: ago(4) },
  { id: 'm7', senderType: 'VENDOR', content: 'Claro, te lo comparto para que lo agregues desde aquí.', createdAt: ago(3) },
  { id: 'm8', senderType: 'VENDOR', type: 'PRODUCT_CARD', metadata: { clave: 'PK-0500', description: 'Kit empaques pistón 50 mm', priceNet: '612.00', imageUrl: '' }, createdAt: ago(3) },
  { id: 'm9', senderType: 'SYSTEM', type: 'EVENT', content: 'El cliente agregó *Kit empaques pistón* a su pedido', metadata: { tone: 'success' }, createdAt: ago(2) },
  { id: 'm10', senderType: 'VENDOR', type: 'CART_SUMMARY', metadata: { items: client1.cartData.items, subtotal: 1070, iva: 171.2, total: 1241.2, shippingAddress: client1.cartData.shippingAddress }, createdAt: ago(1) },
];

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <Eyebrow tone="muted" className="mb-3 block">{title}</Eyebrow>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

function DesignSystem() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('a');
  const [sw, setSw] = useState(true);
  return (
    <div className="mx-auto max-w-5xl p-8">
      <PageHeader eyebrow="Design system" title="Primitivas" description="Botones, badges, campos y superficies con los tokens semánticos." />

      <Section title="Botones">
        <Button variant="primary" icon={Plus}>Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger" icon={Trash2}>Peligro</Button>
        <Button variant="success">Éxito</Button>
        <Button variant="inverse">Inverso</Button>
        <Button variant="primary" loading>Cargando</Button>
        <Button variant="chip">Respuestas rápidas</Button>
        <Button variant="chip-accent">Nota interna</Button>
        <IconButton icon={Bell} label="Notificaciones" variant="outline" />
        <IconButton icon={ShoppingCart} label="Carrito" variant="primary" />
      </Section>

      <Section title="Badges y estados">
        <Badge>Neutral</Badge>
        <Badge tone="accent">Acento</Badge>
        <Badge tone="success" dot>Carrito listo</Badge>
        <Badge tone="warning">Aviso</Badge>
        <Badge tone="danger">Peligro</Badge>
        <Badge tone="info">Info</Badge>
        <Badge tone="solid-danger">Escalado</Badge>
        {['PENDING_ASSIGNMENT', 'ACTIVE', 'ESCALATED', 'WAITING_CUSTOMER', 'ON_HOLD', 'SCHEDULED', 'CLOSED_WON', 'CLOSED', 'DISCARDED'].map((s) => <StatusPill key={s} status={s} variant="long" />)}
      </Section>

      <Section title="Tipografía">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Título de página · Inter 20/600</h1>
          <h2 className="text-base font-semibold">Título de sección · 16/600</h2>
          <p className="text-sm text-fg">Cuerpo · 14/400 · El vendedor abre un chat y responde en menos de 30 segundos.</p>
          <p className="text-[13px] text-fg-muted">Secundario · 13 · fg-muted</p>
          <Eyebrow>Eyebrow · JetBrains Mono 11 · tracking 0.12em</Eyebrow>
          <p className="tnum font-mono text-sm">$1,070.00 · PS-PTB05006060P · 10:21</p>
          <p className="text-xs text-fg-subtle">Subtle · 12 · fg-subtle (mínimo legible)</p>
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
          <Field label="Correo" hint="Usamos este correo para avisos."><Input placeholder="tu@empresa.com" /></Field>
          <Field label="Con error" error="Este campo es obligatorio"><Input aria-invalid placeholder="…" /></Field>
          <Field label="Búsqueda"><Input leftIcon={Search} mono placeholder="ptb 50" /></Field>
          <Field label="Selección"><Select><option>Sin asignar</option><option>Luis Martínez</option></Select></Field>
          <Field label="Texto largo" className="col-span-2"><Textarea placeholder="Escribe aquí…" /></Field>
          <Switch checked={sw} onChange={setSw} label="IA activa fuera de horario" />
          <div className="flex items-center gap-2 text-sm text-fg-muted">Atajo <Kbd>⌘</Kbd><Kbd>K</Kbd></div>
        </div>
      </Section>

      <Section title="Superficies">
        <Panel eyebrow="Panel" title="Con encabezado" description="Descripción breve del contenido." actions={<Button size="sm">Acción</Button>} className="w-80">
          <p className="text-sm text-fg-muted">Contenido del panel.</p>
        </Panel>
        <Panel className="w-80" padded={false}>
          <EmptyState compact icon={Search} title="Sin resultados" description="Prueba con otros términos." action={<Button size="sm" variant="chip">Limpiar filtros</Button>} />
        </Panel>
        <div className="flex items-center gap-3"><Avatar name="Luis Martínez" size="lg" /><Avatar name="Rocío Peña" tone="muted" /><Avatar name="Admin Demo" size="sm" /></div>
        <div className="w-full"><Tabs items={[{ id: 'a', label: 'Todos', count: 12 }, { id: 'b', label: 'Sin asignar', count: 3 }, { id: 'c', label: 'SLA en riesgo', count: 1 }]} value={tab} onChange={setTab} /></div>
        <Button onClick={() => setOpen(true)}>Abrir modal</Button>
        <Button variant="outline" onClick={() => toast.success('Cotización generada', { description: 'Cotizacion_2026.pdf' })}>Toast éxito</Button>
        <Button variant="outline" onClick={() => toast.error('No se pudo guardar', { description: 'Error 500 del servidor' })}>Toast error</Button>
        <Modal open={open} onClose={() => setOpen(false)} eyebrow="Confirmar" title="¿Reasignar conversación?" description="El asesor actual dejará de ver este chat." footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="primary" onClick={() => setOpen(false)}>Asignar</Button></>} />
      </Section>
    </div>
  );
}

function ChatMock() {
  const [current, setCurrent] = useState('cv1');
  const conv = MOCK_CONVERSATIONS.find((c) => c.id === current);
  return (
    <div className="flex h-full w-full min-w-0 bg-bg">
      <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <Eyebrow>Bandeja</Eyebrow>
          <span className="tnum font-mono text-[11px] text-fg-subtle">6 abiertos</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ChatList conversations={MOCK_CONVERSATIONS} currentConversationId={current} onSelect={setCurrent} vendorMap={{ u1: 'Luis Martínez', u2: 'Ana Ruiz' }} />
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MessageList
          conversationId={conv.id}
          conversation={conv}
          messages={current === 'cv1' ? MOCK_MESSAGES : MOCK_MESSAGES.slice(0, 3)}
          onSendMessage={async (t, internal) => toast.info(internal ? 'Nota guardada (mock)' : 'Mensaje enviado (mock)', { description: t })}
          onSendMedia={async () => {}}
          clientName={conv.client.name || conv.client.phoneNumber}
          vendorName="Luis Martínez"
          headerActions={<><Button variant="success" size="sm">Resolver</Button><Button variant="danger" size="sm">Escalar</Button></>}
        />
      </section>
      <aside className="hidden h-full w-72 shrink-0 border-l border-border xl:flex">
        <CatalogPanel client={conv.client} onOpenCart={() => toast.info('Abrir carrito (mock)')} />
      </aside>
    </div>
  );
}

const PAGE_VIEWS = {
  settings: Settings,
  users: UserListPage,
  clients: Clients,
  history: History,
  metrics: Metrics,
};

const VIEWS = [
  ['chat', 'Chat'], ['dashboard', 'Dashboard'], ['ds', 'Design system'], ['settings', 'Settings'], ['users', 'Usuarios'],
  ['clients', 'Clientes'], ['history', 'Historial'], ['metrics', 'Métricas'], ['search', 'Búsqueda'], ['cart', 'Carrito'], ['palette', 'Cmd+K'],
];

export default function UIPreview() {
  const [view, setView] = useState('chat');
  const [role, setRole] = useState('VENDOR');

  useEffect(() => {
    useAuthStore.setState({ user: { ...MOCK_USER, role }, token: 'preview' });
    useChatStore.setState({ conversations: MOCK_CONVERSATIONS, unreadCounts: { cv3: 2, cv4: 1 } });
  }, [role]);

  useEffect(() => {
    useUIStore.getState().setCommandPalette(view === 'palette');
  }, [view]);

  const PageComp = PAGE_VIEWS[view];

  return (
    <div className="flex h-screen bg-bg text-fg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-4 py-1.5">
          <Eyebrow tone="accent" className="mr-3">Preview</Eyebrow>
          {VIEWS.map(([id, label]) => (
            <Button key={id} size="xs" variant={view === id ? 'secondary' : 'ghost'} onClick={() => setView(id)}>{label}</Button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Eyebrow tone="muted" className="mr-1">Rol</Eyebrow>
            {['VENDOR', 'COORDINATOR', 'ADMIN'].map((r) => (
              <Button key={r} size="xs" variant={role === r ? 'secondary' : 'ghost'} onClick={() => setRole(r)}>{r}</Button>
            ))}
          </div>
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">
          {view === 'chat' && <ChatMock />}
          {view === 'dashboard' && <div className="h-full overflow-y-auto p-6 custom-scrollbar"><CoordinatorDashboard /></div>}
          {view === 'ds' && <div className="h-full overflow-y-auto custom-scrollbar"><DesignSystem /></div>}
          {PageComp && <div className="h-full overflow-y-auto p-6 custom-scrollbar"><PageComp /></div>}
          {view === 'search' && <SearchPage />}
          {view === 'cart' && (
            <div className="flex h-full justify-end bg-bg">
              <div className="h-full w-[440px] border-l border-border bg-surface">
                <CartViewer cartData={client1.cartData} client={client1} onClose={() => setView('chat')} />
              </div>
            </div>
          )}
          {view === 'palette' && <><ChatMock /><CommandPalette /></>}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
