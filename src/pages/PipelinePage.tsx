import { useMemo, useState } from 'react';
import { ArrowRight, GripVertical } from 'lucide-react';
import type { Lead, LeadStage } from '@/domain/types';
import { formatCurrency } from '@/domain/calculations';
import { Badge, Select } from '@/components/Form';
import { useApp } from '@/store/AppContext';

const STAGES: LeadStage[] = ['Inquiry', 'Quote Sent', 'Deposit Paid', 'Closed Won', 'Lost'];
const STAGE_LABELS: Record<LeadStage, string> = {
  Inquiry: 'inquiry', 'Quote Sent': 'quoteSent', 'Deposit Paid': 'depositPaid', 'Closed Won': 'closedWon', Lost: 'lost',
};
const STAGE_COLORS: Record<LeadStage, string> = {
  Inquiry: 'border-slate-300 dark:border-slate-700',
  'Quote Sent': 'border-sky-400 dark:border-sky-700',
  'Deposit Paid': 'border-amber-400 dark:border-amber-700',
  'Closed Won': 'border-emerald-400 dark:border-emerald-700',
  Lost: 'border-rose-400 dark:border-rose-700',
};
const ALLOWED: Record<LeadStage, LeadStage[]> = {
  Inquiry: ['Quote Sent', 'Lost'],
  'Quote Sent': ['Deposit Paid', 'Lost'],
  'Deposit Paid': ['Closed Won', 'Lost'],
  'Closed Won': [],
  Lost: [],
};

export function PipelinePage() {
  const { leads, saveLead, i18n, settings } = useApp();
  const t = i18n.t;
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const currency = settings?.reportingCurrency ?? 'USD';
  const byStage = useMemo(() => Object.fromEntries(STAGES.map((stage) => [stage, leads.filter((lead) => lead.stage === stage)])) as Record<LeadStage, Lead[]>, [leads]);

  const moveLead = async (lead: Lead, stage: LeadStage) => {
    if (!ALLOWED[lead.stage].includes(stage)) {
      setNotice(t('pipeline.invalidTransition'));
      return;
    }
    await saveLead({ ...lead, stage });
    setNotice('');
  };

  return <div className="space-y-4">
    {notice && <p role="status" className="text-sm text-rose-600 dark:text-rose-400">{notice}</p>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {STAGES.map((stage) => {
        const stageLeads = byStage[stage];
        const quotedValue = stageLeads.reduce((total, lead) => total + lead.budget, 0);
        const weightedForecast = stageLeads.reduce((total, lead) => {
          const probability = stage === 'Inquiry' ? 0.1 : stage === 'Quote Sent' ? 0.4 : stage === 'Deposit Paid' || stage === 'Closed Won' ? 1 : 0;
          return total + lead.budget * probability;
        }, 0);
        return <section key={stage} className="min-w-0" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
          event.preventDefault();
          const lead = leads.find((item) => item.leadId === (event.dataTransfer.getData('text/plain') || draggedLeadId));
          if (lead) void moveLead(lead, stage);
          setDraggedLeadId(null);
        }}>
          <div className={`border-t-2 ${STAGE_COLORS[stage]} pb-2 pt-3`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t(`lead.${STAGE_LABELS[stage]}`)}</h2>
              <Badge color={stage === 'Closed Won' ? 'emerald' : stage === 'Lost' ? 'rose' : 'slate'}>{stageLeads.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t('dash.quotedValue')}: {formatCurrency(quotedValue, currency, i18n.lang)}</p>
            <p className="text-xs text-slate-500">{t('dash.forecastValue')}: {formatCurrency(weightedForecast, currency, i18n.lang)}</p>
          </div>
          <div className="min-h-36 space-y-2 rounded-md bg-slate-50/70 p-2 dark:bg-slate-900/50">
            {stageLeads.map((lead) => <div key={lead.leadId} draggable={ALLOWED[lead.stage].length > 0}
              onDragStart={(event) => { setDraggedLeadId(lead.leadId); event.dataTransfer.setData('text/plain', lead.leadId); event.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => setDraggedLeadId(null)}
              className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${draggedLeadId === lead.leadId ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-2">
                <GripVertical size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{lead.clientName}</p>
                  <p className="truncate text-xs text-slate-500">{lead.destination} · {lead.partySize} {t('lead.partySize')}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(lead.budget, lead.currency, i18n.lang)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">{t('lead.stage')}</span>
                    <ArrowRight size={12} className="text-slate-400" />
                    <Select aria-label={`${t('pipeline.moveLead')} ${lead.clientName}`} value={lead.stage} disabled={ALLOWED[lead.stage].length === 0}
                      onChange={(event) => void moveLead(lead, event.target.value as LeadStage)} className="min-w-0 px-2 py-1 text-xs">
                      <option value={lead.stage}>{t(`lead.${STAGE_LABELS[lead.stage]}`)}</option>
                      {ALLOWED[lead.stage].map((target) => <option key={target} value={target}>{t(`lead.${STAGE_LABELS[target]}`)}</option>)}
                    </Select>
                  </div>
                </div>
              </div>
            </div>)}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
