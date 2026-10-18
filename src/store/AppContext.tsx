import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Agent,
  Booking,
  Currency,
  GsdTask,
  Lead,
  Settings,
  TourPackage,
} from '@/domain/types';
import { agentRepo, bookingRepo, leadRepo, packageRepo, settingsRepo, taskRepo } from '@/data/repositories';
import { isSeeded, seedDemoData } from '@/data/seed';
import { makeI18n, type I18n } from '@/i18n';
import { useTheme, type ThemeMode } from '@/theme/useTheme';

interface AppContextValue {
  loading: boolean;
  isDemo: boolean;
  agent: Agent | undefined;
  settings: Settings | undefined;
  leads: Lead[];
  packages: TourPackage[];
  bookings: Booking[];
  tasks: GsdTask[];
  i18n: I18n;
  themeMode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setThemeMode: (m: ThemeMode) => void;
  setLanguage: (l: 'vi' | 'en') => void;
  setSettings: (patch: Partial<Settings>) => Promise<void>;
  setAgent: (patch: Partial<Agent>) => Promise<void>;
  refresh: () => Promise<void>;
  // CRUD
  saveLead: (l: Omit<Lead, 'leadId' | 'createdAt' | 'updatedAt'> & { leadId?: string }) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  savePackage: (p: Omit<TourPackage, 'packageId' | 'createdAt' | 'updatedAt'> & { packageId?: string }) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  saveBooking: (b: Omit<Booking, 'bookingId' | 'createdAt' | 'updatedAt'> & { bookingId?: string }) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  saveTask: (t: Omit<GsdTask, 'taskId' | 'createdAt' | 'updatedAt'> & { taskId?: string }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  recordPayment: (bookingId: string, amount: number) => Promise<void>;
  online: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [agent, setAgentState] = useState<Agent | undefined>();
  const [settings, setSettingsState] = useState<Settings | undefined>();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tasks, setTasks] = useState<GsdTask[]>([]);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const { mode: themeMode, setMode: setThemeMode, effective: effectiveTheme } = useTheme(settings?.theme ?? 'system');

  const lang = settings?.language ?? 'en';
  const i18n = useMemo(() => makeI18n(lang), [lang]);

  const refresh = useCallback(async () => {
    const [a, s, l, p, b, t] = await Promise.all([
      agentRepo.get(),
      settingsRepo.get(),
      leadRepo.all(),
      packageRepo.all(),
      bookingRepo.all(),
      taskRepo.all(),
    ]);
    setAgentState(a);
    setSettingsState(s);
    setLeads(l);
    setPackages(p);
    setBookings(b);
    setTasks(t);
    setIsDemo(a?.agentId === 'agent_demo_01');
  }, []);

  useEffect(() => {
    (async () => {
      const seeded = await isSeeded();
      if (!seeded) await seedDemoData(false);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const setLanguage = useCallback((l: 'vi' | 'en') => {
    if (!settings) return;
    const updated = { ...settings, language: l, updatedAt: new Date().toISOString() };
    settingsRepo.save(updated);
    setSettingsState(updated);
    localStorage.setItem('pg_lang', l);
  }, [settings]);

  const setSettings = useCallback(async (patch: Partial<Settings>) => {
    if (!settings) return;
    const updated: Settings = { ...settings, ...patch, updatedAt: new Date().toISOString() };
    await settingsRepo.save(updated);
    setSettingsState(updated);
    if (patch.theme) setThemeMode(patch.theme);
  }, [settings, setThemeMode]);

  const setAgent = useCallback(async (patch: Partial<Agent>) => {
    if (!agent) return;
    const updated: Agent = { ...agent, ...patch, agentId: agent.agentId, updatedAt: new Date().toISOString() };
    await agentRepo.save(updated);
    setAgentState(updated);
  }, [agent]);

  const saveLead: AppContextValue['saveLead'] = useCallback(async (l) => {
    if (l.leadId) {
      await leadRepo.update(l.leadId, l);
    } else {
      const { leadId: _omit, ...rest } = l;
      void _omit;
      await leadRepo.create(rest);
    }
    setLeads(await leadRepo.all());
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    await leadRepo.remove(id);
    setLeads(await leadRepo.all());
  }, []);

  const savePackage: AppContextValue['savePackage'] = useCallback(async (p) => {
    if (p.packageId) {
      await packageRepo.update(p.packageId, p);
    } else {
      const { packageId: _omit, ...rest } = p;
      void _omit;
      await packageRepo.create(rest);
    }
    setPackages(await packageRepo.all());
  }, []);

  const deletePackage = useCallback(async (id: string) => {
    await packageRepo.remove(id);
    setPackages(await packageRepo.all());
  }, []);

  const saveBooking: AppContextValue['saveBooking'] = useCallback(async (b) => {
    if (b.bookingId) {
      await bookingRepo.update(b.bookingId, b);
    } else {
      const { bookingId: _omit, ...rest } = b;
      void _omit;
      await bookingRepo.create(rest);
    }
    setBookings(await bookingRepo.all());
  }, []);

  const deleteBooking = useCallback(async (id: string) => {
    await bookingRepo.remove(id);
    setBookings(await bookingRepo.all());
  }, []);

  const saveTask: AppContextValue['saveTask'] = useCallback(async (t) => {
    if (t.taskId) {
      await taskRepo.update(t.taskId, t);
    } else {
      const { taskId: _omit, ...rest } = t;
      void _omit;
      await taskRepo.create(rest);
    }
    setTasks(await taskRepo.all());
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await taskRepo.remove(id);
    setTasks(await taskRepo.all());
  }, []);

  const recordPayment = useCallback(async (bookingId: string, amount: number) => {
    const b = await bookingRepo.get(bookingId);
    if (!b) return;
    const newPaid = Math.min(b.totalAmount, b.amountPaid + amount);
    const paymentStatus = newPaid >= b.totalAmount ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
    await bookingRepo.update(bookingId, { amountPaid: newPaid, paymentStatus });
    setBookings(await bookingRepo.all());
  }, []);

  // Keep theme synced with settings when settings change
  useEffect(() => {
    if (settings?.theme && settings.theme !== themeMode) {
      setThemeMode(settings.theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.theme]);

  const value: AppContextValue = {
    loading,
    isDemo,
    agent,
    settings,
    leads,
    packages,
    bookings,
    tasks,
    i18n,
    themeMode,
    effectiveTheme,
    setThemeMode: (m: ThemeMode) => {
      setThemeMode(m);
      if (settings) setSettings({ theme: m });
    },
    setLanguage,
    setSettings,
    setAgent,
    refresh,
    saveLead,
    deleteLead,
    savePackage,
    deletePackage,
    saveBooking,
    deleteBooking,
    saveTask,
    deleteTask,
    recordPayment,
    online,
  };

  void (settings?.reportingCurrency as Currency | undefined);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
