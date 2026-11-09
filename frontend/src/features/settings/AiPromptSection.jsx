import { useEffect, useMemo, useState } from 'react';
import { Save, RotateCcw, Eye, History, ChevronDown, ChevronRight, Copy, Undo2 } from 'lucide-react';
import { getAiPrompts, saveAiPrompts, previewAiPrompts, getAiPromptHistory, restoreAiPromptVersion, resetAiPrompts } from '../../services/api.js';
import { toast } from '../../stores/useToastStore.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { Panel, Field, Textarea, Button, Badge, Spinner, Switch, Eyebrow, Modal, Kbd } from '../../components/ui/index.js';
import { formatDate } from '../../utils/formatDate.js';
import { cn } from '../../utils/cn.js';

/** Editable sections, in display order. Keys are dotted paths into the prompt config. */
const GROUPS = [
  {
    id: 'identity', title: 'Identidad y modos de respuesta',
    description: 'Quién es el agente y cómo debe comportarse según tenga contexto de la base de conocimiento, catálogo, o ninguno.',
    fields: [
      { path: 'agent.identity', label: 'Identidad', rows: 2 },
      { path: 'agent.modeWithContext', label: 'Con contexto de la base de conocimiento', rows: 4 },
      { path: 'agent.modeCatalogOnly', label: 'Solo catálogo (sin fragmentos relevantes)', rows: 4 },
      { path: 'agent.modeNothing', label: 'Sin conocimiento ni catálogo', rows: 3 },
    ],
  },
  {
    id: 'rules', title: 'Reglas de comportamiento',
    description: 'Pedido, cotización, datos fiscales, envío y la regla de oro antes de escalar. Las secciones {{#has_fiscal_tools}} se activan según las capacidades del catálogo.',
    fields: [{ path: 'agent.rules', label: 'Reglas', rows: 18, mono: true }],
  },
  {
    id: 'catalog', title: 'Catálogo',
    description: 'Cómo se presenta el catálogo al agente. {{catalog_description}} y {{catalog_rules}} vienen de Configuración → Catálogo.',
    fields: [
      { path: 'agent.catalogConfigured', label: 'Con catálogo conectado', rows: 10 },
      { path: 'agent.catalogMissing', label: 'Sin catálogo', rows: 4 },
    ],
  },
  {
    id: 'context', title: 'Contexto y datos en tiempo real',
    fields: [
      { path: 'agent.context', label: 'Bloque de contexto (base de conocimiento)', rows: 2 },
      { path: 'agent.dynamicContext', label: 'Datos del sistema (fecha, vendedores, carrito, diccionario)', rows: 10 },
    ],
  },
  {
    id: 'offHours', title: 'Fuera de horario',
    fields: [{ path: 'agent.offHours', label: 'Instrucción fuera de horario', rows: 6 }],
  },
  {
    id: 'tools', title: 'Descripciones de herramientas',
    description: 'Qué le dice el sistema al modelo sobre cada herramienta. Los parámetros técnicos no se editan aquí.',
    fields: [
      { path: 'tools.consultar_catalogo', label: 'consultar_catalogo', rows: 3 },
      { path: 'tools.actualizar_carrito', label: 'actualizar_carrito', rows: 3 },
      { path: 'tools.consultar_cliente_rfc', label: 'consultar_cliente_rfc', rows: 2 },
      { path: 'tools.generar_cotizacion_pdf', label: 'generar_cotizacion_pdf', rows: 2 },
      { path: 'tools.extraer_constancia_fiscal', label: 'extraer_constancia_fiscal', rows: 3 },
      { path: 'tools.enviar_cotizacion_email', label: 'enviar_cotizacion_email', rows: 2 },
    ],
  },
  {
    id: 'notes', title: 'Notas internas tras buscar en el catálogo',
    description: 'Instrucciones que recibe el modelo junto con los resultados (no las ve el cliente).',
    fields: [
      { path: 'catalogNotes.empty', label: 'Sin resultados', rows: 2 },
      { path: 'catalogNotes.limit', label: 'Más de 5 resultados', rows: 2 },
      { path: 'catalogNotes.cardsSent', label: 'Tarjetas enviadas al cliente', rows: 4 },
      { path: 'catalogNotes.cardsAlreadyVisible', label: 'Tarjetas ya visibles', rows: 3 },
      { path: 'catalogNotes.pricesAreNet', label: 'Precios netos', rows: 2 },
    ],
  },
  {
    id: 'inline', title: 'Asistente del vendedor (Preguntar a la IA)',
    fields: [{ path: 'inlineAssist', label: 'Instrucción', rows: 8 }],
  },
  {
    id: 'summary', title: 'Resumen del agente',
    fields: [{ path: 'summary', label: 'Instrucción', rows: 10 }],
  },
  {
    id: 'customer', title: 'Mensajes que ve el cliente',
    fields: [
      { path: 'customerMessages.aiUnavailable', label: 'IA no disponible o cuota agotada', rows: 2 },
      { path: 'customerMessages.escalationFallback', label: 'Escalación sin texto del modelo', rows: 2 },
      { path: 'customerMessages.emptyModelReply', label: 'El modelo no devolvió texto', rows: 2 },
    ],
  },
];

const getPath = (obj, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), obj);
const setPath = (obj, path, value) => {
  const keys = path.split('.');
  const out = { ...obj };
  let cur = out;
  keys.slice(0, -1).forEach((k) => { cur[k] = { ...(cur[k] || {}) }; cur = cur[k]; });
  cur[keys.at(-1)] = value;
  return out;
};
const deletePath = (obj, path) => {
  const keys = path.split('.');
  const out = JSON.parse(JSON.stringify(obj));
  let cur = out;
  for (const k of keys.slice(0, -1)) { if (!cur[k]) return out; cur = cur[k]; }
  delete cur[keys.at(-1)];
  return out;
};
const prune = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prune(v);
    if (p !== undefined && !(p && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length === 0)) out[k] = p;
  }
  return out;
};

export default function AiPromptSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [saved, setSaved] = useState({});
  const [version, setVersion] = useState(0);
  const [variables, setVariables] = useState([]);
  const [open, setOpen] = useState({ identity: true });
  const [preview, setPreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [scenario, setScenario] = useState({ has_knowledge_context: true, has_catalog: true, is_off_hours: false, has_fiscal_tools: true, can_lookup_customer: true, can_extract_csf: true });
  const [history, setHistory] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [note, setNote] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await getAiPrompts();
        setDefaults(d.defaults);
        setOverrides(d.overrides || {});
        setSaved(d.overrides || {});
        setVersion(d.version || 0);
        setVariables(d.variables || []);
      } catch (e) {
        toast.error('No se pudo cargar la configuración de prompts', { description: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirty = useMemo(() => JSON.stringify(prune(overrides)) !== JSON.stringify(prune(saved)), [overrides, saved]);
  const overriddenCount = useMemo(() => GROUPS.flatMap((g) => g.fields).filter((f) => getPath(overrides, f.path) !== undefined).length, [overrides]);

  const valueOf = (path) => getPath(overrides, path) ?? getPath(defaults, path) ?? '';
  const isOverridden = (path) => getPath(overrides, path) !== undefined && getPath(overrides, path) !== getPath(defaults, path);

  const change = (path, value) => {
    setOverrides((o) => (value === getPath(defaults, path) ? deletePath(o, path) : setPath(o, path, value)));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorDetails(null);
    try {
      const d = await saveAiPrompts(prune(overrides), note || undefined);
      setSaved(d.overrides || {});
      setOverrides(d.overrides || {});
      setVersion(d.version);
      setNote('');
      setHistory(null);
      toast.success(`Prompts guardados · versión ${d.version}`, { description: 'Aplican desde el siguiente mensaje del agente.' });
    } catch (e) {
      setErrorDetails(e.details || null);
      toast.error('No se pudo guardar', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      setPreview(await previewAiPrompts(prune(overrides), scenario));
    } catch (e) {
      toast.error('No se pudo generar la vista previa', { description: e.message });
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHistory(await getAiPromptHistory());
    } catch (e) {
      toast.error('No se pudo cargar el historial', { description: e.message });
    }
  };

  const handleRestore = async (v) => {
    try {
      const d = await restoreAiPromptVersion(v);
      setSaved(d.overrides || {});
      setOverrides(d.overrides || {});
      setVersion(d.version);
      setHistory(null);
      toast.success(`Versión ${v} restaurada como v${d.version}`);
    } catch (e) {
      toast.error('No se pudo restaurar', { description: e.message });
    }
  };

  const handleReset = async () => {
    setConfirmReset(false);
    try {
      await resetAiPrompts();
      setOverrides({});
      setSaved({});
      setVersion((v) => v + 1);
      toast.success('Prompts restablecidos a la plantilla base');
    } catch (e) {
      toast.error('No se pudo restablecer', { description: e.message });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!defaults) return null;

  return (
    <div className="space-y-6">
      <Panel
        eyebrow="Asistente IA"
        title="Prompts del agente"
        description="Todo el texto que recibe el modelo. Las variables entre llaves las llena el sistema con datos del negocio; el resto es redacción tuya. La plantilla base es el punto de partida."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={overriddenCount ? 'accent' : 'neutral'}>{overriddenCount ? `${overriddenCount} personalizados` : 'Plantilla base'}</Badge>
            {version > 0 && <Badge tone="info">v{version}</Badge>}
            {dirty && <Badge tone="warning" dot>Sin guardar</Badge>}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={Eye} onClick={handlePreview}>Vista previa</Button>
          <Button variant="secondary" size="sm" icon={History} onClick={() => (history ? setHistory(null) : loadHistory())}>Historial</Button>
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setConfirmReset(true)} disabled={!overriddenCount && !version}>Restablecer todo</Button>
          <div className="ml-auto flex items-center gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota de la versión (opcional)" className="h-8 w-56 rounded-md border border-border bg-surface-2 px-2.5 text-[13px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none" />
            <Button variant="primary" size="sm" icon={Save} loading={saving} disabled={!dirty} onClick={handleSave}>Guardar</Button>
          </div>
        </div>
        {errorDetails && (
          <ul role="alert" className="mt-3 list-disc pl-5 text-xs text-danger">{errorDetails.map((d) => <li key={d}>{d}</li>)}</ul>
        )}
        <div className="mt-4 rounded-md border border-border bg-surface-2/60 px-3.5 py-3">
          <Eyebrow tone="muted" className="mb-2 block">Variables disponibles</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <button
                key={v.name}
                type="button"
                title={`${v.description}\n(clic para copiar)`}
                onClick={() => { navigator.clipboard?.writeText(`{{${v.name}}}`); toast.info(`{{${v.name}}} copiado`); }}
                className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg-muted hover:border-border-strong hover:text-fg"
              >
                <Copy size={10} aria-hidden />{`{{${v.name}}}`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-fg-subtle">Secciones condicionales: <Kbd>{'{{#var}}'}</Kbd>…<Kbd>{'{{/var}}'}</Kbd> se muestra si la variable es verdadera; <Kbd>{'{{^var}}'}</Kbd> si es falsa. La etiqueta <Kbd>{'{{escalate_token}}'}</Kbd> es el protocolo de transferencia: si la eliminas, el sistema añade una instrucción mínima para que siga funcionando.</p>
        </div>
      </Panel>

      {history && (
        <Panel eyebrow="Historial" title="Versiones guardadas" padded={false}>
          {history.length === 0 ? (
            <p className="px-5 py-6 text-sm text-fg-muted">Aún no hay versiones guardadas.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-fg"><Badge tone={h.version === version ? 'accent' : 'neutral'}>v{h.version}</Badge>{h.note || <span className="text-fg-subtle">Sin nota</span>}</div>
                    <div className="mt-0.5 text-xs text-fg-subtle">{formatDate(h.createdAt)}{h.createdBy?.name ? ` · ${h.createdBy.name}` : ''} · {Object.keys(h.overrides || {}).length ? 'personalizado' : 'plantilla base'}</div>
                  </div>
                  {h.version !== version && <Button size="xs" variant="outline" icon={Undo2} onClick={() => handleRestore(h.version)}>Restaurar</Button>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {GROUPS.map((g) => {
        const isOpen = !!open[g.id];
        const customized = g.fields.filter((f) => isOverridden(f.path)).length;
        return (
          <Panel key={g.id} padded={false} className="overflow-hidden">
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [g.id]: !isOpen }))} className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-surface-2/60" aria-expanded={isOpen}>
              <div className="flex min-w-0 items-center gap-3">
                {isOpen ? <ChevronDown size={16} className="shrink-0 text-fg-subtle" /> : <ChevronRight size={16} className="shrink-0 text-fg-subtle" />}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-fg">{g.title}</h3>
                  {g.description && <p className="mt-0.5 text-[13px] text-fg-muted">{g.description}</p>}
                </div>
              </div>
              {customized > 0 && <Badge tone="accent" className="shrink-0">{customized} personalizado{customized > 1 ? 's' : ''}</Badge>}
            </button>
            {isOpen && (
              <div className="space-y-4 border-t border-border px-5 py-4">
                {g.fields.map((f) => {
                  const over = isOverridden(f.path);
                  return (
                    <Field
                      key={f.path}
                      label={
                        <span className="flex items-center gap-2">
                          {f.label}
                          {over && <Badge tone="accent">Personalizado</Badge>}
                          {over && (
                            <button type="button" onClick={() => setOverrides((o) => deletePath(o, f.path))} className="text-[11px] text-fg-muted underline-offset-2 hover:text-fg hover:underline">
                              restablecer
                            </button>
                          )}
                        </span>
                      }
                    >
                      {(p) => (
                        <Textarea
                          {...p}
                          rows={f.rows || 4}
                          value={valueOf(f.path)}
                          onChange={(e) => change(f.path, e.target.value)}
                          className={cn('leading-relaxed', f.mono ? 'font-mono text-xs' : 'text-[13px]', over && 'border-accent/50')}
                          spellCheck={false}
                        />
                      )}
                    </Field>
                  );
                })}
              </div>
            )}
          </Panel>
        );
      })}

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} size="xl" eyebrow="Vista previa" title="Instrucción del agente compilada" description="Con datos de ejemplo. Cambia el escenario para ver cada modo.">
        <div className="mb-3 flex flex-wrap gap-3">
          {[['has_knowledge_context', 'Con fragmentos RAG'], ['has_catalog', 'Con catálogo'], ['is_off_hours', 'Fuera de horario'], ['has_fiscal_tools', 'Tools fiscales'], ['can_extract_csf', 'Lectura CSF']].map(([k, label]) => (
            <Switch key={k} checked={!!scenario[k]} onChange={(v) => setScenario((s) => ({ ...s, [k]: v, ...(k === 'has_fiscal_tools' ? { can_lookup_customer: v } : {}) }))} label={label} />
          ))}
          <Button size="xs" variant="secondary" icon={Eye} loading={previewLoading} onClick={handlePreview} className="ml-auto">Recompilar</Button>
        </div>
        {previewLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : preview ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow tone="muted">Instrucción del sistema</Eyebrow>
              <span className="tnum font-mono text-[11px] text-fg-subtle">≈ {preview.approxTokens} tokens por turno</span>
            </div>
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-fg custom-scrollbar">{preview.instruction}</pre>
          </>
        ) : null}
      </Modal>

      <ConfirmModal
        open={confirmReset}
        title="¿Restablecer todos los prompts?"
        message="Se descartan todas las personalizaciones y el agente vuelve a la plantilla base. Se guarda una versión para poder volver atrás."
        confirmText="Restablecer"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
