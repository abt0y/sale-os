import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';

const baseField =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition';

export function Field({ label, children, required, hint }: { label: string; children: ReactNode; required?: boolean; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseField} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseField} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseField} ${props.className ?? ''}`} />;
}

interface BadgeProps {
  children: ReactNode;
  color?: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'indigo';
  className?: string;
}

const badgeColors: Record<NonNullable<BadgeProps['color']>, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

export function Badge({ children, color = 'slate', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badgeColors[color]} ${className}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
