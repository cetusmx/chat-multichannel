import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Zap, Sparkles, Lock, Paperclip, SendHorizontal, X, EyeOff, FileText } from 'lucide-react';
import useAuthStore from '../../../stores/useAuthStore';
import { post } from '../../../services/api';
import CannedResponsesPopover from './CannedResponsesPopover';
import { Button, IconButton, Eyebrow } from '../../../components/ui/index.js';
import { formatBytes } from '../../../utils/formatDate.js';
import { cn } from '../../../utils/cn.js';

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4', 'video/3gpp', 'video/quicktime',
  'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg',
];
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const AI_QUICK_PROMPTS = [
  { label: 'Resumir chat', prompt: 'Generar un resumen de los requerimientos técnicos del cliente' },
  {
    label: 'Dirección de envío',
    prompt:
      'Extrae la dirección de envío proporcionada por el cliente. PASO 1: Depúrala, estandarízala y dale formato profesional (Calle, Número, Colonia, Código Postal, Ciudad, Estado). PASO 2: Usa la herramienta actualizar_carrito ASEGURÁNDOTE de pasar ESTRICTAMENTE la dirección depurada y formateada en el parámetro shipping_address (NUNCA la dirección cruda). PASO 3: Respóndeme con la dirección que guardaste.',
  },
  { label: 'Extraer CSF', action: 'csf' },
  { label: 'Redactar oferta', prompt: 'Propón una respuesta cordial y persuasiva ofreciendo nuestros sellos mecánicos u O-rings' },
];

/**
 * Message composer: toolbar chips, textarea, attachments, AI assistant and
 * canned responses. Exposes `attachFile(file)` through the ref so the parent
 * can route drag & drop into it.
 */
const ChatComposer = forwardRef(function ChatComposer(
  { conversationId, clientName, onSendMessage, onSendMedia, isUploading, disabledInput, conversationStatus, onError, isDraft, onCancelDraft },
  ref,
) {
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [aiError, setAiError] = useState(null);
  const [isDrafting, setIsDrafting] = useState(false);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const aiPanelRef = useRef(null);
  const aiTriggerRef = useRef(null);
  const abortRef = useRef(null);

  const isInternalRestricted = conversationStatus === 'PENDING_ASSIGNMENT' && ['ADMIN', 'COORDINATOR'].includes(user?.role);
  const canToggleInternal = user && ['ADMIN', 'COORDINATOR', 'VENDOR'].includes(user.role);
  const busy = isUploading || isDrafting;

  const closeAi = () => {
    setAiOpen(false);
    setAiDraft('');
    setAiPrompt('');
    setAiError(null);
    abortRef.current?.abort();
    setIsDrafting(false);
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    abortRef.current?.abort();
    setIsDrafting(false);
    setText('');
    setAiOpen(false);
    setAiPrompt('');
    setAiDraft('');
    setAiError(null);
    setSelectedFile(null);
    setIsInternal(false);
  }, [conversationId]);

  useEffect(() => {
    if (!aiOpen) return;
    const onDown = (e) => {
      if (aiPanelRef.current && !aiPanelRef.current.contains(e.target) && aiTriggerRef.current && !aiTriggerRef.current.contains(e.target)) closeAi();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [aiOpen]);

  const attachFile = (file) => {
    if (!file) return;
    if (file.type && !ALLOWED_MIME.includes(file.type)) {
      onError?.('Tipo de archivo no permitido.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      onError?.('El archivo supera el límite de 15 MB.');
      return;
    }
    setSelectedFile(file);
    inputRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({ attachFile, focus: () => inputRef.current?.focus() }), []);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (busy) return;

    if (selectedFile) {
      try {
        abortRef.current = new AbortController();
        await onSendMedia?.(selectedFile, text.trim(), isInternal, abortRef.current.signal);
        setSelectedFile(null);
        setText('');
        setIsInternal(false);
      } catch (error) {
        onError?.(error.message || 'Error al enviar archivo.');
      }
    } else if (text.trim()) {
      try {
        await onSendMessage(text.trim(), isInternal);
        setText('');
        setIsInternal(false);
      } catch {
        /* parent surfaces errors through the store */
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!cannedOpen) handleSend(e);
      return;
    }
    if (e.key === '/' && text === '') setCannedOpen(true);
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    setCannedOpen(val.startsWith('/'));
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleCannedSelect = (content) => {
    let finalContent = content || '';
    finalContent = finalContent.replace(/\{\{vendedor_nombre\}\}/gi, user?.name || '');
    finalContent = finalContent.replace(/\{\{cliente_nombre\}\}/gi, clientName || '');
    setText(finalContent);
    inputRef.current?.focus();
  };

  const generateAi = async (prompt) => {
    const p = (prompt ?? aiPrompt).trim();
    if (!p || !conversationId) return;
    abortRef.current?.abort();
    setIsDrafting(true);
    setAiError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await post(`/conversations/${conversationId}/ai-assist`, { prompt: p }, { signal: controller.signal });
      if (!res.ok) {
        const textRes = await res.text();
        let message = 'Error del servidor';
        try { message = JSON.parse(textRes).error || message; } catch { message = textRes || message; }
        throw new Error(message);
      }
      const data = await res.json();
      if (controller.signal.aborted) return;
      const draft = data?.draft || data?.data?.draft;
      if (draft) setAiDraft(draft);
      else setAiError('La IA no devolvió ninguna sugerencia.');
    } catch (err) {
      if (err.name !== 'AbortError') setAiError(err.message || 'Error de red al conectar con IA');
    } finally {
      if (!controller.signal.aborted) setIsDrafting(false);
    }
  };

  const extractCsf = async () => {
    if (!conversationId) return;
    setIsDrafting(true);
    setAiError(null);
    try {
      const res = await post(`/conversations/${conversationId}/extract-csf`);
      if (!res.ok) setAiError('Error al procesar la CSF');
      else closeAi();
    } catch {
      setAiError('Error de red al conectar con el servidor');
    } finally {
      setIsDrafting(false);
    }
  };

  const useDraft = () => {
    setText(text ? `${text}\n${aiDraft}` : aiDraft);
    closeAi();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const placeholder = disabledInput
    ? 'Esta conversación está cerrada.'
    : isUploading
      ? 'Enviando…'
      : selectedFile
        ? 'Añade un comentario al archivo…'
        : isInternal
          ? 'Escribe una nota para tu equipo…'
          : 'Escribe un mensaje al cliente…  ( / para respuestas rápidas )';

  return (
    <div className="relative border-t border-border bg-surface px-4 pb-3 pt-2.5">
      {aiOpen && (
        <div ref={aiPanelRef} className="absolute bottom-full left-4 right-4 z-50 mb-2 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={11} className="text-accent" aria-hidden />
              <Eyebrow>Asistente IA</Eyebrow>
            </span>
            <IconButton icon={X} label="Cerrar asistente" size="sm" onClick={closeAi} />
          </div>
          <div className="p-3">
            {aiError ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-danger">{aiError}</p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={closeAi}>Cancelar</Button>
                  <Button variant="primary" size="sm" onClick={() => { setAiError(null); generateAi(); }}>Reintentar</Button>
                </div>
              </div>
            ) : !aiDraft ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {AI_QUICK_PROMPTS.map((q) => (
                    <Button key={q.label} variant="chip" size="xs" disabled={isDrafting} onClick={() => (q.action === 'csf' ? extractCsf() : (setAiPrompt(q.prompt), generateAi(q.prompt)))}>
                      {q.label}
                    </Button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); generateAi(); }} className="flex gap-2">
                  <input
                    autoFocus
                    className="h-9 flex-1 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                    placeholder="Pídele algo a la IA, p. ej. “Saluda y ofrece ayuda con sus pagos”"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={isDrafting}
                    onKeyDown={(e) => e.key === 'Escape' && (closeAi(), setTimeout(() => inputRef.current?.focus(), 0))}
                  />
                  <Button type="submit" variant="primary" size="md" loading={isDrafting} disabled={!aiPrompt.trim()}>Generar</Button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <textarea
                  className="w-full resize-y rounded-md border border-border bg-surface-2 p-3 text-sm leading-relaxed text-fg focus:border-accent focus:outline-none"
                  rows={5}
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && (closeAi(), setTimeout(() => inputRef.current?.focus(), 0))}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAiDraft('')}>Reintentar</Button>
                  <Button variant="primary" size="sm" onClick={useDraft}>Usar borrador</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Button variant="chip" size="xs" icon={Zap} disabled={disabledInput || busy} onClick={() => { setCannedOpen((o) => !o); inputRef.current?.focus(); }}>
          Respuestas rápidas
        </Button>
        <Button ref={aiTriggerRef} variant="chip" size="xs" icon={Sparkles} disabled={disabledInput || isUploading} onClick={() => (aiOpen ? closeAi() : (setAiDraft(''), setAiPrompt(''), setAiError(null), setAiOpen(true)))} title="Asistencia IA">
          Preguntar a la IA
        </Button>
        {canToggleInternal && (
          <Button
            variant={isInternal ? 'chip-accent' : 'chip'}
            size="xs"
            icon={Lock}
            disabled={disabledInput || isUploading || isInternalRestricted}
            onClick={() => setIsInternal((v) => !v)}
            aria-pressed={isInternal}
            title={isInternalRestricted ? 'Asigna la conversación para escribir notas internas' : isInternal ? 'Modo nota interna activo' : 'Escribir nota interna'}
          >
            Nota interna
          </Button>
        )}
        {isInternal && (
          <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-fg-subtle sm:inline-flex">
            <EyeOff size={11} aria-hidden />
            Lo marcado en naranja nunca llega al WhatsApp del cliente
          </span>
        )}
      </div>

      {selectedFile && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-sm text-fg">
            <FileText size={14} className="shrink-0 text-fg-muted" aria-hidden />
            <span className="truncate">{selectedFile.name}</span>
            <span className="tnum shrink-0 font-mono text-[11px] text-fg-subtle">{formatBytes(selectedFile.size)}</span>
          </div>
          <IconButton icon={X} label="Quitar archivo" size="sm" onClick={() => setSelectedFile(null)} disabled={isUploading} />
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-2">
        <div className="relative flex-1">
          <CannedResponsesPopover
            isOpen={cannedOpen}
            onClose={() => setCannedOpen(false)}
            onSelect={handleCannedSelect}
            filterText={text.startsWith('/') ? text.substring(1) : ''}
            anchorEl={inputRef.current}
          />
          <div
            className={cn(
              'flex items-end rounded-lg border bg-surface-2 transition-colors focus-within:border-accent',
              isInternal ? 'border-dashed border-accent/60 bg-accent/[0.04]' : 'border-border',
              disabledInput && 'opacity-60',
            )}
          >
            <textarea
              rows={1}
              ref={inputRef}
              aria-label={isInternal ? 'Nota interna' : 'Mensaje al cliente'}
              className="max-h-40 min-h-[42px] flex-1 resize-none bg-transparent px-3.5 py-2.5 text-sm leading-snug text-fg placeholder:text-fg-subtle focus:outline-none disabled:cursor-not-allowed"
              placeholder={placeholder}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={busy || disabledInput}
            />
            <IconButton
              icon={Paperclip}
              label="Adjuntar archivo"
              size="lg"
              className="mb-0.5 mr-1"
              disabled={busy || disabledInput}
              loading={isUploading}
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => { attachFile(e.target.files?.[0]); e.target.value = ''; }}
              disabled={busy || disabledInput}
              accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
          </div>
        </div>
        {isDraft && (
          <Button variant="outline" size="lg" onClick={onCancelDraft}>Cancelar</Button>
        )}
        <IconButton
          type="submit"
          icon={SendHorizontal}
          label={isInternal ? 'Guardar nota' : 'Enviar mensaje'}
          variant={isInternal ? 'primary' : 'inverse'}
          size="xl"
          className="h-[42px] w-[42px] rounded-lg"
          disabled={(!text.trim() && !selectedFile) || busy || disabledInput}
        />
      </form>
    </div>
  );
});

export default ChatComposer;
