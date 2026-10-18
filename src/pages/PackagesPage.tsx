import { useMemo, useState } from 'react';
import { Clock3, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AvailabilityStatus, Currency, TourPackage } from '@/domain/types';
import { daysUntil, formatCurrency, grossMarginPct, grossProfit } from '@/domain/calculations';
import { Badge, Card, EmptyState, Field, Input, Select } from '@/components/Form';
import { Button } from '@/components/Button';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { useApp } from '@/store/AppContext';

const CURRENCIES: Currency[] = ['VND', 'USD', 'KRW', 'JPY'];
const AVAILABILITY: AvailabilityStatus[] = ['Available', 'Limited', 'Sold Out', 'On Request'];
const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  Available: 'available', Limited: 'limited', 'Sold Out': 'soldOut', 'On Request': 'onRequest',
};
const availabilityColors: Record<AvailabilityStatus, 'emerald' | 'amber' | 'rose' | 'sky'> = {
  Available: 'emerald',
  Limited: 'amber',
  'Sold Out': 'rose',
  'On Request': 'sky',
};

export function PackagesPage() {
  const { packages, savePackage, deletePackage, settings, i18n } = useApp();
  const t = i18n.t;
  const [editing, setEditing] = useState<TourPackage | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [destination, setDestination] = useState('');
  const [availability, setAvailability] = useState<AvailabilityStatus | 'all'>('all');
  const [margin, setMargin] = useState<'all' | 'floor' | 'healthy'>('all');

  const filtered = useMemo(() => packages.filter((pkg) => {
    const marginPct = grossMarginPct(pkg);
    if (destination && !pkg.destination.toLowerCase().includes(destination.toLowerCase())) return false;
    if (availability !== 'all' && pkg.availabilityStatus !== availability) return false;
    if (margin === 'floor' && marginPct >= (settings?.marginFloorPercent ?? 0)) return false;
    if (margin === 'healthy' && marginPct < (settings?.marginFloorPercent ?? 0)) return false;
    return true;
  }), [packages, destination, availability, margin, settings?.marginFloorPercent]);

  const statusLabel = (status: AvailabilityStatus) => t(`pkg.${AVAILABILITY_LABELS[status]}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('common.destination')}><Input value={destination} onChange={(event) => setDestination(event.target.value)} /></Field>
        <Field label={t('pkg.availability')}>
          <Select value={availability} onChange={(event) => setAvailability(event.target.value as AvailabilityStatus | 'all')}>
            <option value="all">{t('common.all')}</option>
            {AVAILABILITY.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
          </Select>
        </Field>
        <Field label={t('pkg.margin')}>
          <Select value={margin} onChange={(event) => setMargin(event.target.value as typeof margin)}>
            <option value="all">{t('common.all')}</option>
            <option value="floor">{t('pkg.marginBelowFloor')} · {settings?.marginFloorPercent ?? 0}%</option>
            <option value="healthy">{t('pkg.marginAtOrAboveFloor')} · {settings?.marginFloorPercent ?? 0}%</option>
          </Select>
        </Field>
        <Button className="ml-auto" onClick={() => setCreating(true)}><Plus size={16} />{t('pkg.newPackage')}</Button>
      </div>

      {filtered.length === 0 ? <Card><EmptyState title={t('common.empty')} /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((pkg) => {
            const marginPct = grossMarginPct(pkg);
            const cutoffDays = daysUntil(pkg.supplierCutoffAt);
            const cutoffUrgent = cutoffDays !== null && cutoffDays <= 2;
            return (
              <Card key={pkg.packageId} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900 dark:text-white">{pkg.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{pkg.destination} · {pkg.durationDays} {t('pkg.days')}</p>
                  </div>
                  <Badge color={availabilityColors[pkg.availabilityStatus]}>{statusLabel(pkg.availabilityStatus)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-slate-500">{t('pkg.sellingPrice')}</p><p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(pkg.sellingPrice, pkg.currency, i18n.lang)}</p></div>
                  <div><p className="text-xs text-slate-500">{t('pkg.baseCost')}</p><p className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(pkg.baseCost, pkg.currency, i18n.lang)}</p></div>
                  <div><p className="text-xs text-slate-500">{t('pkg.margin')}</p><p className="font-medium text-emerald-700 dark:text-emerald-400">{formatCurrency(grossProfit(pkg), pkg.currency, i18n.lang)} · {marginPct.toFixed(1)}%</p></div>
                  <div><p className="text-xs text-slate-500">{t('pkg.season')}</p><p className="font-medium text-slate-700 dark:text-slate-300">{pkg.season || t('common.none')}</p></div>
                </div>
                {pkg.supplierCutoffAt && <p className={`flex items-center gap-1.5 text-xs ${cutoffUrgent ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}><Clock3 size={13} />{t('pkg.supplierCutoff')}: {cutoffDays !== null && cutoffDays < 0 ? t('common.overdue') : `${cutoffDays} ${t('common.days')}`}</p>}
                <div className="flex gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <Button size="sm" variant="ghost" aria-label={t('common.edit')} onClick={() => setEditing(pkg)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" aria-label={t('common.delete')} onClick={() => setDeleteId(pkg.packageId)}><Trash2 size={14} /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(creating || editing) && <PackageFormModal
        item={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={async (data) => { await savePackage(data); setCreating(false); setEditing(null); }}
      />}
      <ConfirmDialog
        open={!!deleteId}
        title={t('common.delete')}
        message={t('pkg.title')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={async () => { if (deleteId) await deletePackage(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function PackageFormModal({ item, onClose, onSave }: {
  item: TourPackage | null;
  onClose: () => void;
  onSave: (data: Omit<TourPackage, 'packageId' | 'createdAt' | 'updatedAt'> & { packageId?: string }) => Promise<void>;
}) {
  const { i18n } = useApp();
  const t = i18n.t;
  const [form, setForm] = useState({
    title: item?.title ?? '', destination: item?.destination ?? '', durationDays: item?.durationDays ?? 1,
    baseCost: item?.baseCost ?? 0, sellingPrice: item?.sellingPrice ?? 0, currency: item?.currency ?? 'USD' as Currency,
    availabilityStatus: item?.availabilityStatus ?? 'Available' as AvailabilityStatus,
    supplierCutoffAt: item?.supplierCutoffAt?.slice(0, 16) ?? '', season: item?.season ?? '',
  });
  const submit = async () => onSave({
    packageId: item?.packageId, ...form,
    supplierCutoffAt: form.supplierCutoffAt ? new Date(form.supplierCutoffAt).toISOString() : undefined,
  });

  return <Modal open onClose={onClose} title={item ? t('pkg.editPackage') : t('pkg.newPackage')} size="lg"
    footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} disabled={!form.title || !form.destination}>{t('common.save')}</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('pkg.name')} required><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
      <Field label={t('common.destination')} required><Input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} /></Field>
      <Field label={t('pkg.duration')}><Input type="number" min={1} value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: Number(event.target.value) })} /></Field>
      <Field label={t('common.currency')}><Select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as Currency })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</Select></Field>
      <Field label={t('pkg.baseCost')}><Input type="number" min={0} value={form.baseCost} onChange={(event) => setForm({ ...form, baseCost: Number(event.target.value) })} /></Field>
      <Field label={t('pkg.sellingPrice')}><Input type="number" min={0} value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: Number(event.target.value) })} /></Field>
      <Field label={t('pkg.availability')}><Select value={form.availabilityStatus} onChange={(event) => setForm({ ...form, availabilityStatus: event.target.value as AvailabilityStatus })}>{AVAILABILITY.map((value) => <option key={value} value={value}>{t(`pkg.${AVAILABILITY_LABELS[value]}`)}</option>)}</Select></Field>
      <Field label={t('pkg.season')}><Input value={form.season} onChange={(event) => setForm({ ...form, season: event.target.value })} /></Field>
      <Field label={t('pkg.supplierCutoff')}><Input type="datetime-local" value={form.supplierCutoffAt} onChange={(event) => setForm({ ...form, supplierCutoffAt: event.target.value })} /></Field>
    </div>
  </Modal>;
}
