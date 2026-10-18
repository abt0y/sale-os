import { useState } from 'react';
import { Copy, ExternalLink, FileDown, Pencil, Plus, Receipt, Trash2, Tag } from 'lucide-react';
import type { Booking, BookingStatus, Currency, PaymentStatus } from '@/domain/types';
import { formatCurrency, formatDate, outstandingBalance } from '@/domain/calculations';
import { Button } from '@/components/Button';
import { Badge, Card, EmptyState, Field, Input, Select } from '@/components/Form';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useApp } from '@/store/AppContext';
import { applySeasonalDiscount } from '@/integrations/discount';
import { generateItineraryPdf } from '@/integrations/pdf';

const CURRENCIES: Currency[] = ['VND', 'USD', 'KRW', 'JPY'];
const BOOKING_STATUSES: BookingStatus[] = ['Draft', 'Confirmed', 'Cancelled', 'Completed'];
const paymentColors: Record<PaymentStatus, 'slate' | 'amber' | 'emerald' | 'rose'> = {
  Unpaid: 'slate', Partial: 'amber', Paid: 'emerald', Refunded: 'rose',
};

export function BookingsPage() {
  const { bookings, leads, packages, agent, settings, saveBooking, deleteBooking, recordPayment, i18n } = useApp();
  const t = i18n.t;
  const [editing, setEditing] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [discountBooking, setDiscountBooking] = useState<Booking | null>(null);
  const [notice, setNotice] = useState('');

  const paymentLabel = (status: PaymentStatus) => t(`book.${status.toLowerCase()}`);
  const bookingLabel = (status: BookingStatus) => t(`book.${status.toLowerCase()}`);

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setNotice(t('book.linkCopied'));
    } catch {
      setNotice(t('book.copyFailed'));
    }
  };

  const openLink = (link: string) => {
    try {
      const url = new URL(link);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Invalid protocol');
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch {
      setNotice(t('book.invalidLink'));
    }
  };

  const createPdf = (booking: Booking) => {
    const lead = leads.find((item) => item.leadId === booking.leadId);
    if (!lead) return;
    const pkg = packages.find((item) => item.packageId === booking.packageId);
    generateItineraryPdf(lead, pkg, booking, agent?.name ?? '', i18n.lang).save(`itinerary-${booking.bookingId}.pdf`);
    setNotice(t('act.pdfGenerated'));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
        <Button className="ml-auto" onClick={() => setCreating(true)}><Plus size={16} />{t('book.newBooking')}</Button>
      </div>
      {bookings.length === 0 ? <Card><EmptyState title={t('common.empty')} /></Card> : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const lead = leads.find((item) => item.leadId === booking.leadId);
            const pkg = packages.find((item) => item.packageId === booking.packageId);
            return <Card key={booking.bookingId} className="p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900 dark:text-white">{lead?.clientName ?? booking.bookingId}</h2>
                    <Badge color={paymentColors[booking.paymentStatus]}>{paymentLabel(booking.paymentStatus)}</Badge>
                    <Badge color={booking.bookingStatus === 'Confirmed' || booking.bookingStatus === 'Completed' ? 'emerald' : booking.bookingStatus === 'Cancelled' ? 'rose' : 'slate'}>{bookingLabel(booking.bookingStatus)}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{lead?.destination ?? '—'}{pkg ? ` · ${pkg.title}` : ''}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Money label={t('book.total')} value={booking.totalAmount} booking={booking} locale={i18n.lang} />
                    <Money label={t('book.deposit')} value={booking.depositAmount} booking={booking} locale={i18n.lang} />
                    <Money label={t('book.amountPaid')} value={booking.amountPaid} booking={booking} locale={i18n.lang} />
                    <Money label={t('book.balance')} value={outstandingBalance(booking)} booking={booking} locale={i18n.lang} accent />
                  </div>
                  {booking.balanceDueDate && <p className="text-xs text-slate-500">{t('book.balanceDue')}: {formatDate(booking.balanceDueDate, i18n.lang)}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    <Field label={t('book.paymentLink')}><Input value={booking.paymentLink ?? ''} readOnly className="min-w-56" /></Field>
                    {booking.paymentLink && <>
                      <Button size="sm" variant="outline" aria-label={t('book.copyLink')} onClick={() => void copyLink(booking.paymentLink!)}><Copy size={14} />{t('book.copyLink')}</Button>
                      <Button size="sm" variant="outline" aria-label={t('book.openLink')} onClick={() => openLink(booking.paymentLink!)}><ExternalLink size={14} />{t('book.openLink')}</Button>
                    </>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-2 dark:border-slate-800 xl:w-44 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
                  <Button size="sm" variant="secondary" onClick={() => {
                    const amount = Number(window.prompt(t('book.paymentAmount'), String(outstandingBalance(booking))));
                    if (Number.isFinite(amount) && amount > 0) void recordPayment(booking.bookingId, amount);
                  }} disabled={outstandingBalance(booking) <= 0}><Receipt size={14} />{t('book.recordPayment')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setDiscountBooking(booking)}><Tag size={14} />{t('act.discount')}</Button>
                  <Button size="sm" variant="outline" onClick={() => createPdf(booking)}><FileDown size={14} />{t('act.pdf')}</Button>
                  <Button size="sm" variant="ghost" aria-label={t('common.edit')} onClick={() => setEditing(booking)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" aria-label={t('common.delete')} onClick={() => setDeleteId(booking.bookingId)}><Trash2 size={14} /></Button>
                </div>
              </div>
            </Card>;
          })}
        </div>
      )}
      {(creating || editing) && <BookingFormModal
        booking={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={async (data) => { await saveBooking(data); setCreating(false); setEditing(null); }}
      />}
      {discountBooking && <DiscountModal booking={discountBooking} onClose={() => setDiscountBooking(null)} onApply={async (updatedTotal) => {
        await saveBooking({
          ...discountBooking,
          totalAmount: updatedTotal,
          paymentStatus: discountBooking.amountPaid >= updatedTotal ? 'Paid' : discountBooking.amountPaid > 0 ? 'Partial' : 'Unpaid',
        });
        setDiscountBooking(null);
        setNotice(t('act.discountApplied'));
      }} />}
      <ConfirmDialog open={!!deleteId} title={t('common.delete')} message={t('book.title')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} danger
        onConfirm={async () => { if (deleteId) await deleteBooking(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function Money({ label, value, booking, locale, accent = false }: { label: string; value: number; booking: Booking; locale: string; accent?: boolean }) {
  return <div><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className={`text-sm font-semibold ${accent ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>{formatCurrency(value, booking.currency, locale)}</p></div>;
}

function BookingFormModal({ booking, onClose, onSave }: {
  booking: Booking | null;
  onClose: () => void;
  onSave: (data: Omit<Booking, 'bookingId' | 'createdAt' | 'updatedAt'> & { bookingId?: string }) => Promise<void>;
}) {
  const { leads, packages, i18n } = useApp();
  const t = i18n.t;
  const [form, setForm] = useState({
    leadId: booking?.leadId ?? '', packageId: booking?.packageId ?? '', totalAmount: booking?.totalAmount ?? 0,
    depositAmount: booking?.depositAmount ?? 0, amountPaid: booking?.amountPaid ?? 0,
    balanceDueDate: booking?.balanceDueDate?.slice(0, 10) ?? '', paymentStatus: booking?.paymentStatus ?? 'Unpaid' as PaymentStatus,
    bookingStatus: booking?.bookingStatus ?? 'Draft' as BookingStatus, currency: booking?.currency ?? 'USD' as Currency,
    confirmedAt: booking?.confirmedAt?.slice(0, 10) ?? '', paymentLink: booking?.paymentLink ?? '',
  });
  const submit = async () => {
    if (!form.leadId) return;
    await onSave({ bookingId: booking?.bookingId, ...form,
      packageId: form.packageId || undefined,
      balanceDueDate: form.balanceDueDate ? new Date(`${form.balanceDueDate}T12:00:00`).toISOString() : undefined,
      confirmedAt: form.confirmedAt ? new Date(`${form.confirmedAt}T12:00:00`).toISOString() : undefined,
      paymentStatus: form.amountPaid >= form.totalAmount ? 'Paid' : form.amountPaid > 0 ? 'Partial' : 'Unpaid',
    });
  };
  return <Modal open onClose={onClose} title={booking ? t('book.editBooking') : t('book.newBooking')} size="lg"
    footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} disabled={!form.leadId}>{t('common.save')}</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('book.lead')} required><Select value={form.leadId} onChange={(event) => setForm({ ...form, leadId: event.target.value })}><option value="">{t('common.none')}</option>{leads.map((lead) => <option key={lead.leadId} value={lead.leadId}>{lead.clientName} · {lead.destination}</option>)}</Select></Field>
      <Field label={t('book.package')}><Select value={form.packageId} onChange={(event) => setForm({ ...form, packageId: event.target.value })}><option value="">{t('common.none')}</option>{packages.map((pkg) => <option key={pkg.packageId} value={pkg.packageId}>{pkg.title}</option>)}</Select></Field>
      <Field label={t('common.currency')}><Select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as Currency })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</Select></Field>
      <Field label={t('book.total')}><Input type="number" min={0} value={form.totalAmount} onChange={(event) => setForm({ ...form, totalAmount: Number(event.target.value) })} /></Field>
      <Field label={t('book.deposit')}><Input type="number" min={0} value={form.depositAmount} onChange={(event) => setForm({ ...form, depositAmount: Number(event.target.value) })} /></Field>
      <Field label={t('book.amountPaid')}><Input type="number" min={0} value={form.amountPaid} onChange={(event) => setForm({ ...form, amountPaid: Number(event.target.value) })} /></Field>
      <Field label={t('book.bookingStatus')}><Select value={form.bookingStatus} onChange={(event) => setForm({ ...form, bookingStatus: event.target.value as BookingStatus })}>{BOOKING_STATUSES.map((status) => <option key={status} value={status}>{t(`book.${status.toLowerCase()}`)}</option>)}</Select></Field>
      <Field label={t('book.balanceDue')}><Input type="date" value={form.balanceDueDate} onChange={(event) => setForm({ ...form, balanceDueDate: event.target.value })} /></Field>
      <Field label={t('book.confirmedAt')}><Input type="date" value={form.confirmedAt} onChange={(event) => setForm({ ...form, confirmedAt: event.target.value })} /></Field>
      <div className="sm:col-span-2"><Field label={t('book.paymentLink')}><Input type="url" value={form.paymentLink} onChange={(event) => setForm({ ...form, paymentLink: event.target.value })} /></Field></div>
    </div>
  </Modal>;
}

function DiscountModal({ booking, onClose, onApply }: { booking: Booking; onClose: () => void; onApply: (total: number) => Promise<void> }) {
  const { packages, agent, leads, settings, i18n } = useApp();
  const t = i18n.t;
  const [discountPercent, setDiscountPercent] = useState(5);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const apply = async () => {
    const pkg = packages.find((item) => item.packageId === booking.packageId);
    if (!pkg) { setError(t('book.discountNeedsPackage')); return; }
    const lead = leads.find((item) => item.leadId === booking.leadId);
    const result = await applySeasonalDiscount({
      originalPrice: booking.totalAmount, discountPercent, marginFloorPercent: settings?.marginFloorPercent ?? 0,
      baseCost: pkg.baseCost * (lead?.partySize ?? 1), bookingId: booking.bookingId, leadId: booking.leadId, reason,
      approvedBy: agent?.name ?? '',
    });
    if (!result.ok) { setError(`${t('act.discountRejected')} (${result.marginPctAfter.toFixed(1)}% < ${settings?.marginFloorPercent ?? 0}%)`); return; }
    await onApply(result.finalPrice);
  };
  return <Modal open onClose={onClose} title={t('act.discount')} size="md"
    footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={() => void apply()} disabled={!reason.trim()}>{t('common.confirm')}</Button></>}>
    <div className="space-y-3">
      <Field label={t('act.discountPercent')}><Input type="number" min={0.1} max={100} step={0.5} value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.target.value))} /></Field>
      <Field label={t('act.discountReason')} required><Input value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  </Modal>;
}
