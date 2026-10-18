import { useRef, useState } from 'react';
import { Download, FileUp, RotateCcw, ShieldCheck, Wifi } from 'lucide-react';
import type { Currency, Settings } from '@/domain/types';
import { Button } from '@/components/Button';
import { Card, Field, Input, Select } from '@/components/Form';
import { useApp } from '@/store/AppContext';
import { exportData, downloadFile, importData, toCSV } from '@/data/importExport';
import { resetDemoData } from '@/data/seed';
import { DeterministicDecisionEngine, OnnxDecisionEngine } from '@/ai/decisionEngine';
import { webmcp } from '@/webmcp/adapter';

const CURRENCIES: Currency[] = ['VND', 'USD', 'KRW', 'JPY'];
const deterministicEngine = new DeterministicDecisionEngine();
const onnxEngine = new OnnxDecisionEngine();

export function SettingsPage() {
  const { agent, settings, setAgent, setSettings, setThemeMode, setLanguage, themeMode, i18n, refresh } = useApp();
  const t = i18n.t;
  const importInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState('');
  const webmcpStatus = webmcp.status();
  if (!agent || !settings) return null;

  const updateSetting = (patch: Partial<Settings>) => { void setSettings(patch); };
  const handleJsonExport = async () => {
    const bundle = await exportData();
    downloadFile(`phuc-gia-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2));
    setNotice(t('set.exportComplete'));
  };
  const handleCsvExport = async () => {
    const data = await exportData();
    const rows: Record<string, unknown>[] = [
      ...data.agents.map((row) => ({ recordType: 'agent', ...row as object })),
      ...data.leads.map((row) => ({ recordType: 'lead', ...row as object })),
      ...data.packages.map((row) => ({ recordType: 'package', ...row as object })),
      ...data.bookings.map((row) => ({ recordType: 'booking', ...row as object })),
      ...data.tasks.map((row) => ({ recordType: 'task', ...row as object })),
      ...data.settings.map((row) => ({ recordType: 'settings', ...row as object })),
      ...data.discountAudits.map((row) => ({ recordType: 'discountAudit', ...row as object })),
    ];
    downloadFile(`phuc-gia-export-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
    setNotice(t('set.exportComplete'));
  };
  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      const content: unknown = JSON.parse(await file.text());
      const result = await importData(content, { replace: true });
      if (!result.ok) {
        setNotice(`${t('set.importFailed')} ${result.errors.join('; ')}`);
        return;
      }
      await refresh();
      setNotice(t('set.importSuccess'));
    } catch {
      setNotice(t('set.importFailed'));
    } finally {
      if (importInput.current) importInput.current.value = '';
    }
  };
  const handleReset = async () => {
    if (!window.confirm(t('set.confirmReset'))) return;
    await resetDemoData();
    await refresh();
    setNotice(t('set.resetDone'));
  };

  return <div className="space-y-5">
    {notice && <p role="status" className="text-sm text-sky-700 dark:text-sky-300">{notice}</p>}
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('set.agent')}</h2>
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <Field label={t('set.agentName')}><Input value={agent.name} onChange={(event) => void setAgent({ name: event.target.value })} /></Field>
        <Field label={t('common.currency')}><Select value={agent.currency} onChange={(event) => void setAgent({ currency: event.target.value as Currency })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</Select></Field>
        <Field label={t('set.monthlyTarget')}><Input type="number" min={0} value={agent.monthlyRevenueTarget} onChange={(event) => void setAgent({ monthlyRevenueTarget: Number(event.target.value) })} /></Field>
        <Field label={t('set.commissionRate')}><Input type="number" min={0} max={100} step={0.1} value={Number((agent.commissionRate * 100).toFixed(2))} onChange={(event) => void setAgent({ commissionRate: Number(event.target.value) / 100 })} /></Field>
      </Card>
    </section>

    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('set.salesPlanning')}</h2>
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t('set.sellingDaysTotal')}><Input type="number" min={1} value={settings.sellingDaysTotal} onChange={(event) => updateSetting({ sellingDaysTotal: Number(event.target.value) })} /></Field>
        <Field label={t('set.sellingDaysElapsed')}><Input type="number" min={0} max={settings.sellingDaysTotal} value={settings.sellingDaysElapsed} onChange={(event) => updateSetting({ sellingDaysElapsed: Number(event.target.value) })} /></Field>
        <Field label={t('set.revenueRecognition')}><Select value={settings.revenueRecognition} onChange={(event) => updateSetting({ revenueRecognition: event.target.value as Settings['revenueRecognition'] })}>
          <option value="on_deposit">{t('set.revOnDeposit')}</option><option value="on_confirmation">{t('set.revOnConfirmation')}</option><option value="on_full_payment">{t('set.revOnFullPayment')}</option>
        </Select></Field>
        <Field label={t('set.marginFloor')}><Input type="number" min={0} max={100} value={settings.marginFloorPercent} onChange={(event) => updateSetting({ marginFloorPercent: Number(event.target.value) })} /></Field>
        <Field label={t('set.p0Threshold')}><Input type="number" min={0} max={100} value={settings.p0Threshold} onChange={(event) => updateSetting({ p0Threshold: Number(event.target.value) })} /></Field>
        <Field label={t('set.p1Threshold')}><Input type="number" min={0} max={100} value={settings.p1Threshold} onChange={(event) => updateSetting({ p1Threshold: Number(event.target.value) })} /></Field>
        <Field label={t('set.reportingCurrency')}><Select value={settings.reportingCurrency} onChange={(event) => updateSetting({ reportingCurrency: event.target.value as Currency })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</Select></Field>
      </Card>
    </section>

    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('set.appearance')}</h2>
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <Field label={t('set.theme')}><Select value={themeMode} onChange={(event) => setThemeMode(event.target.value as typeof themeMode)}><option value="light">{t('set.light')}</option><option value="dark">{t('set.dark')}</option><option value="system">{t('set.system')}</option></Select></Field>
        <Field label={t('set.language')}><Select value={i18n.lang} onChange={(event) => setLanguage(event.target.value as 'vi' | 'en')}><option value="en">{t('set.english')}</option><option value="vi">{t('set.vietnamese')}</option></Select></Field>
      </Card>
    </section>

    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('set.dataManagement')}</h2>
      <Card className="flex flex-wrap gap-2 p-4">
        <Button variant="outline" onClick={() => void handleJsonExport()}><Download size={15} />{t('set.exportJson')}</Button>
        <Button variant="outline" onClick={() => void handleCsvExport()}><Download size={15} />{t('set.exportCsv')}</Button>
        <Button variant="outline" onClick={() => importInput.current?.click()}><FileUp size={15} />{t('set.importJson')}</Button>
        <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void handleImport(event.target.files?.[0])} />
        <Button variant="danger" onClick={() => void handleReset()}><RotateCcw size={15} />{t('set.resetDemo')}</Button>
      </Card>
    </section>

    <section className="grid gap-3 lg:grid-cols-2">
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('set.aiStatus')}</h2>
        <div className="flex items-center justify-between gap-3 text-sm"><span>{t('set.aiDeterministic')}</span><span className="text-emerald-700 dark:text-emerald-400">{deterministicEngine.status().available ? t('set.aiActive') : t('set.aiUnavailable')}</span></div>
        <div className="flex items-center justify-between gap-3 text-sm"><span>{t('set.aiOnnx')}</span><span className="text-amber-700 dark:text-amber-400">{t('set.aiNotConfigured')}</span></div>
      </Card>
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('set.webmcpStatus')}</h2>
        <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><Wifi size={15} />{webmcpStatus.supported ? t('set.webmcpAvailable') : t('set.webmcpUnsupported')}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('set.registeredTools')}: {webmcpStatus.registeredCount}</p>
      </Card>
      <Card className="space-y-2 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><ShieldCheck size={15} />{t('set.privacy')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('set.privacyNote')}</p>
      </Card>
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('set.sync')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('set.syncNote')}</p>
      </Card>
    </section>
  </div>;
}
