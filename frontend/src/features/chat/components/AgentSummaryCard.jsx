import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { post } from '../../../services/api';
import useChatStore from '../../../stores/useChatStore';
import { toast } from '../../../stores/useToastStore.js';
import { Eyebrow, IconButton, Button } from '../../../components/ui/index.js';
import { formatRelativeTime } from '../../../utils/formatDate.js';

/**
 * Pinned AI summary shown at the top of a conversation.
 * Reads `conversation.aiSummary`; the backend refreshes it on IA→human
 * handoff and on assignment. Users can regenerate it on demand.
 */
export default function AgentSummaryCard({ conversation, canGenerate = true }) {
  const [loading, setLoading] = useState(false);
  const summary = conversation?.aiSummary;
  const id = conversation?.id;

  if (!id || id === 'draft') return null;

  const regenerate = async () => {
    setLoading(true);
    try {
      const res = await post(`/chat/${id}/summary`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo generar el resumen');
      useChatStore.getState().updateChat(id, json.data);
      toast.success('Resumen actualizado');
    } catch (err) {
      toast.error('No se pudo generar el resumen', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!summary) {
    if (!canGenerate) return null;
    return (
      <div className="flex justify-start">
        <Button variant="chip" size="xs" icon={Sparkles} loading={loading} onClick={regenerate}>
          Generar resumen del agente
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <Sparkles size={12} className="text-accent" aria-hidden />
          <Eyebrow tone="accent">Resumen del agente</Eyebrow>
        </span>
        <span className="inline-flex items-center gap-1.5">
          {conversation.aiSummaryUpdatedAt && (
            <span className="tnum font-mono text-[10px] text-fg-subtle">{formatRelativeTime(conversation.aiSummaryUpdatedAt)}</span>
          )}
          {canGenerate && <IconButton icon={RefreshCw} label="Regenerar resumen" size="sm" loading={loading} onClick={regenerate} className="-my-1" />}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-fg-muted">{summary}</p>
    </div>
  );
}
