import { useState } from 'react';
import { Copy, ExternalLink, MessageCircle } from 'lucide-react';
import type { Lead } from '@/domain/types';
import { useApp } from '@/store/AppContext';
import { buildWhatsAppDraft, normalizePhone } from '@/integrations/whatsapp';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Form';

interface Props {
  lead: Lead;
  agentName: string;
  onClose: () => void;
}

export function WhatsAppModal({ lead, agentName, onClose }: Props) {
  const { i18n } = useApp();
  const t = i18n.t;
  const [phone, setPhone] = useState('');
  const [draft, setDraft] = useState(() => buildWhatsAppDraft(lead, '', agentName, i18n.lang));
  const [copied, setCopied] = useState(false);

  const regenerate = (p: string) => {
    setPhone(p);
    setDraft(buildWhatsAppDraft(lead, p, agentName, i18n.lang));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be blocked */ }
  };

  const valid = !!normalizePhone(phone);

  return (
    <Modal
      open
      onClose={onClose}
      title={t('act.whatsapp')}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="secondary" onClick={copy} disabled={!draft.text}><Copy size={14} /> {t('book.copyLink')}</Button>
          <Button
            onClick={() => { if (draft.url) window.open(draft.url, '_blank', 'noopener'); }}
            disabled={!valid || !draft.url}
          >
            <ExternalLink size={14} /> {t('act.whatsappOpen')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('act.whatsappNumber')} required hint="E.164 format, e.g. +84901234567">
          <Input value={phone} onChange={(e) => regenerate(e.target.value)} placeholder="+84 90 123 4567" inputMode="tel" />
        </Field>
        {draft.error && <p className="text-xs text-rose-600 dark:text-rose-400">{draft.error}</p>}
        <Field label={t('act.whatsappDraft')}>
          <Textarea rows={8} value={draft.text} readOnly />
        </Field>
        {copied && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <MessageCircle size={12} /> {t('act.whatsappCopied')}
          </p>
        )}
        <p className="text-xs text-slate-400">
          {i18n.lang === 'vi' ? 'WhatsApp sẽ mở với tin nhắn đã soạn. Bạn phải xem lại trước khi gửi.' : 'WhatsApp opens with the draft pre-filled. You must review before sending.'}
        </p>
      </div>
    </Modal>
  );
}
