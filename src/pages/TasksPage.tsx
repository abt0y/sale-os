import { useEffect, useMemo, useState } from 'react';
import { Check, Flame, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { GsdTask, TaskStatus, TaskType, UrgencyLevel } from '@/domain/types';
import { rankTasks, scoreTask, streakInfo, type ScoredTask } from '@/domain/scoring';
import { formatCurrency, formatDateTime } from '@/domain/calculations';
import { Badge, Card, EmptyState, Field, Input, Select, Textarea } from '@/components/Form';
import { Button } from '@/components/Button';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useApp } from '@/store/AppContext';

const TASK_TYPES: TaskType[] = ['Follow Up', 'Quote', 'Deposit', 'Itinerary', 'Visa', 'Supplier', 'Custom'];
const STATUSES: TaskStatus[] = ['Open', 'Completed', 'Deferred', 'Cancelled'];
const URGENCIES: UrgencyLevel[] = ['P0', 'P1', 'P2'];

interface Props {
  selectedTaskId?: string;
  onTaskOpened?: () => void;
}

export function TasksPage({ selectedTaskId, onTaskOpened }: Props) {
  const { tasks, leads, bookings, settings, saveTask, deleteTask, i18n } = useApp();
  const t = i18n.t;
  const [editing, setEditing] = useState<GsdTask | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<UrgencyLevel | 'all'>('all');
  const [taskType, setTaskType] = useState<TaskType | 'all'>('all');
  const [status, setStatus] = useState<TaskStatus | 'all'>('Open');
  const [due, setDue] = useState<'all' | 'overdue' | 'today' | 'week' | 'none'>('all');
  const [minimumValue, setMinimumValue] = useState('');

  useEffect(() => {
    if (!selectedTaskId) return;
    const task = tasks.find((item) => item.taskId === selectedTaskId);
    if (task) setEditing(task);
    onTaskOpened?.();
  }, [selectedTaskId, tasks, onTaskOpened]);

  const config = { p0Threshold: settings?.p0Threshold ?? 80, p1Threshold: settings?.p1Threshold ?? 50 };
  const rankedOpen = useMemo(() => rankTasks(tasks, config), [tasks, config.p0Threshold, config.p1Threshold]);
  const rankById = useMemo(() => new Map(rankedOpen.map((item, index) => [item.task.taskId, index])), [rankedOpen]);
  const scoredTasks = useMemo(() => tasks.map((task) => rankedOpen.find((item) => item.task.taskId === task.taskId) ?? scoreTask(task, config))
    .sort((a, b) => (rankById.get(a.task.taskId) ?? Number.MAX_SAFE_INTEGER) - (rankById.get(b.task.taskId) ?? Number.MAX_SAFE_INTEGER)), [tasks, rankedOpen, config.p0Threshold, config.p1Threshold, rankById]);
  const filtered = useMemo(() => scoredTasks.filter((item) => {
    const task = item.task;
    if (urgency !== 'all' && item.priority !== urgency) return false;
    if (taskType !== 'all' && task.taskType !== taskType) return false;
    if (status !== 'all' && task.status !== status) return false;
    if (minimumValue && task.estimatedValue < Number(minimumValue)) return false;
    if (due === 'none' && task.dueAt) return false;
    if (due !== 'all' && due !== 'none') {
      if (!task.dueAt) return false;
      const delta = new Date(task.dueAt).getTime() - Date.now();
      if (due === 'overdue' && delta >= 0) return false;
      if (due === 'today' && (delta < 0 || delta > 24 * 60 * 60 * 1000)) return false;
      if (due === 'week' && (delta < 0 || delta > 7 * 24 * 60 * 60 * 1000)) return false;
    }
    return true;
  }), [scoredTasks, urgency, taskType, status, due, minimumValue]);
  const { currentStreak, completedToday } = useMemo(() => streakInfo(tasks), [tasks]);
  const completionRate = tasks.length ? tasks.filter((task) => task.status === 'Completed').length / tasks.length * 100 : 0;
  const currency = settings?.reportingCurrency ?? 'USD';

  const updateStatus = async (item: ScoredTask, nextStatus: TaskStatus) => {
    await saveTask({ ...item.task, status: nextStatus, completedAt: nextStatus === 'Completed' ? new Date().toISOString() : undefined });
  };
  const typeLabel = (value: TaskType) => t(`task.${value.toLowerCase().replace(/\s/g, '').replace('followup', 'followUp')}`);
  const statusLabel = (value: TaskStatus) => t(`task.${value.toLowerCase()}`);

  return <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
    <aside className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('filters.title')}</h2><Button size="sm" onClick={() => setCreating(true)}><Plus size={14} />{t('task.newTask')}</Button></div>
      <Card className="space-y-3 p-3">
        <Field label={t('filters.urgency')}><Select value={urgency} onChange={(event) => setUrgency(event.target.value as UrgencyLevel | 'all')}><option value="all">{t('common.all')}</option>{URGENCIES.map((value) => <option key={value}>{value}</option>)}</Select></Field>
        <Field label={t('task.taskType')}><Select value={taskType} onChange={(event) => setTaskType(event.target.value as TaskType | 'all')}><option value="all">{t('common.all')}</option>{TASK_TYPES.map((value) => <option key={value} value={value}>{typeLabel(value)}</option>)}</Select></Field>
        <Field label={t('task.status')}><Select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | 'all')}><option value="all">{t('common.all')}</option>{STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</Select></Field>
        <Field label={t('task.dueAt')}><Select value={due} onChange={(event) => setDue(event.target.value as typeof due)}>
          <option value="all">{t('common.all')}</option><option value="overdue">{t('common.overdue')}</option><option value="today">{t('common.today')}</option><option value="week">{t('task.dueThisWeek')}</option><option value="none">{t('task.noDueDate')}</option>
        </Select></Field>
        <Field label={t('task.minimumValue')}><Input type="number" min={0} value={minimumValue} onChange={(event) => setMinimumValue(event.target.value)} /></Field>
      </Card>
    </aside>

    <section className="min-w-0 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label={t('dash.streak')} value={<><Flame size={14} className="text-amber-500" />{currentStreak}</>} />
        <Stat label={t('dash.tasksCompletedToday')} value={completedToday} />
        <Stat label={t('dash.completionRate')} value={`${completionRate.toFixed(0)}%`} />
      </div>
      {filtered.length === 0 ? <Card><EmptyState title={t('common.empty')} /></Card> : <div className="space-y-2">
        {filtered.map((item) => <TaskRow key={item.task.taskId} item={item} currency={currency} locale={i18n.lang} t={t} onEdit={() => setEditing(item.task)} onComplete={() => void updateStatus(item, 'Completed')} onDefer={() => void updateStatus(item, 'Deferred')} onDelete={() => setDeleteId(item.task.taskId)} />)}
      </div>}
    </section>

    {(creating || editing) && <TaskFormModal task={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={async (data) => { await saveTask(data); setCreating(false); setEditing(null); }} />}
    <ConfirmDialog open={!!deleteId} title={t('common.delete')} message={t('task.title')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} danger
      onConfirm={async () => { if (deleteId) await deleteTask(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
  </div>;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <Card className="flex items-center justify-between gap-2 p-3"><span className="text-xs text-slate-500 dark:text-slate-400">{label}</span><span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">{value}</span></Card>;
}

function TaskRow({ item, currency, locale, t, onEdit, onComplete, onDefer, onDelete }: {
  item: ScoredTask; currency: 'VND' | 'USD' | 'KRW' | 'JPY'; locale: string; t: (key: string) => string;
  onEdit: () => void; onComplete: () => void; onDefer: () => void; onDelete: () => void;
}) {
  const task = item.task;
  const priorityColor = item.priority === 'P0' ? 'rose' : item.priority === 'P1' ? 'amber' : 'slate';
  return <Card className="p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><Badge color={priorityColor}>{item.priority} · {item.totalScore}</Badge><Badge color="slate">{t(`task.${task.taskType.toLowerCase().replace(/\s/g, '').replace('followup', 'followUp')}`)}</Badge><Badge color={task.status === 'Completed' ? 'emerald' : task.status === 'Deferred' ? 'amber' : 'slate'}>{t(`task.${task.status.toLowerCase()}`)}</Badge></div>
        <h3 className="mt-2 font-semibold text-slate-900 dark:text-white">{task.title}</h3>
        {task.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{task.description}</p>}
        <p className="mt-2 text-xs text-slate-500">{t('task.dueAt')}: {formatDateTime(task.dueAt, locale)} · {formatCurrency(task.estimatedValue, currency, locale)} · {task.estimatedMinutes} {t('common.minutes')}</p>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t('task.scoreSummary').replace('{priority}', item.priority).replace('{score}', String(item.totalScore))}</p>
        <p className="mt-1 text-sm font-medium text-sky-700 dark:text-sky-300">{t('task.recommend')}: {t(`task.action.${task.taskType.toLowerCase().replace(/\s/g, '').replace('followup', 'followUp')}`)}</p>
        <div className="mt-3 flex flex-wrap gap-2">{item.components.map((component) => <span key={component.key} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t(`task.score.${component.key}`)} {component.score}/{component.max}</span>)}</div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">
        <Button size="sm" variant="ghost" aria-label={t('common.edit')} onClick={onEdit}><Pencil size={14} /></Button>
        {task.status === 'Open' && <><Button size="sm" variant="secondary" onClick={onComplete}><Check size={14} />{t('dash.complete')}</Button><Button size="sm" variant="outline" onClick={onDefer}><RotateCcw size={14} />{t('dash.defer')}</Button></>}
        <Button size="sm" variant="ghost" aria-label={t('common.delete')} onClick={onDelete}><Trash2 size={14} /></Button>
      </div>
    </div>
  </Card>;
}

function TaskFormModal({ task, onClose, onSave }: {
  task: GsdTask | null; onClose: () => void;
  onSave: (data: Omit<GsdTask, 'taskId' | 'createdAt' | 'updatedAt'> & { taskId?: string }) => Promise<void>;
}) {
  const { agent, leads, bookings, i18n } = useApp();
  const t = i18n.t;
  const [form, setForm] = useState({
    title: task?.title ?? '', description: task?.description ?? '', taskType: task?.taskType ?? 'Follow Up' as TaskType,
    urgencyLevel: task?.urgencyLevel ?? 'P1' as UrgencyLevel, estimatedValue: task?.estimatedValue ?? 0,
    estimatedMinutes: task?.estimatedMinutes ?? 15, dueAt: task?.dueAt?.slice(0, 16) ?? '', leadId: task?.leadId ?? '',
    bookingId: task?.bookingId ?? '', status: task?.status ?? 'Open' as TaskStatus,
  });
  const submit = async () => {
    if (!agent || !form.title.trim()) return;
    await onSave({ taskId: task?.taskId, agentId: agent.agentId, ...form,
      leadId: form.leadId || undefined, bookingId: form.bookingId || undefined,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      completedAt: form.status === 'Completed' ? task?.completedAt ?? new Date().toISOString() : undefined,
    });
  };
  return <Modal open onClose={onClose} title={task ? t('task.editTask') : t('task.newTask')} size="lg"
    footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={() => void submit()} disabled={!form.title.trim()}>{t('common.save')}</Button></>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label={t('task.title')} required><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field></div>
      <Field label={t('task.taskType')}><Select value={form.taskType} onChange={(event) => setForm({ ...form, taskType: event.target.value as TaskType })}>{TASK_TYPES.map((value) => <option key={value} value={value}>{t(`task.${value.toLowerCase().replace(/\s/g, '').replace('followup', 'followUp')}`)}</option>)}</Select></Field>
      <Field label={t('task.urgency')}><Select value={form.urgencyLevel} onChange={(event) => setForm({ ...form, urgencyLevel: event.target.value as UrgencyLevel })}>{URGENCIES.map((value) => <option key={value}>{value}</option>)}</Select></Field>
      <Field label={t('task.status')}><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>{STATUSES.map((value) => <option key={value} value={value}>{t(`task.${value.toLowerCase()}`)}</option>)}</Select></Field>
      <Field label={t('task.estimatedValue')}><Input type="number" min={0} value={form.estimatedValue} onChange={(event) => setForm({ ...form, estimatedValue: Number(event.target.value) })} /></Field>
      <Field label={t('task.estimatedMinutes')}><Input type="number" min={1} value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: Number(event.target.value) })} /></Field>
      <Field label={t('task.dueAt')}><Input type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} /></Field>
      <Field label={t('task.associatedLead')}><Select value={form.leadId} onChange={(event) => setForm({ ...form, leadId: event.target.value })}><option value="">{t('common.none')}</option>{leads.map((lead) => <option key={lead.leadId} value={lead.leadId}>{lead.clientName}</option>)}</Select></Field>
      <Field label={t('task.associatedBooking')}><Select value={form.bookingId} onChange={(event) => setForm({ ...form, bookingId: event.target.value })}><option value="">{t('common.none')}</option>{bookings.map((booking) => <option key={booking.bookingId} value={booking.bookingId}>{booking.bookingId}</option>)}</Select></Field>
      <div className="sm:col-span-2"><Field label={t('common.notes')}><Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
    </div>
  </Modal>;
}
