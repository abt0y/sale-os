import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  BookCheck,
  CheckSquare,
  KanbanSquare,
  Settings as SettingsIcon,
  Globe,
  Sun,
  Moon,
  Monitor,
  Wifi,
  WifiOff,
  Menu,
  X,
  Plane,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';
import type { Lang } from '@/i18n/dictionary';

interface NavItem {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export type PageKey = 'dashboard' | 'leads' | 'packages' | 'bookings' | 'tasks' | 'pipeline' | 'settings';

interface Props {
  current: PageKey;
  onNavigate: (p: PageKey) => void;
  children: ReactNode;
}

export function AppShell({ current, onNavigate, children }: Props) {
  const { i18n, themeMode, effectiveTheme, setThemeMode, setLanguage, online, isDemo } = useApp();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const t = i18n.t;

  const navItems: NavItem[] = [
    { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { key: 'leads', label: t('nav.leads'), icon: Users },
    { key: 'packages', label: t('nav.packages'), icon: Package },
    { key: 'bookings', label: t('nav.bookings'), icon: BookCheck },
    { key: 'tasks', label: t('nav.tasks'), icon: CheckSquare },
    { key: 'pipeline', label: t('nav.pipeline'), icon: KanbanSquare },
    { key: 'settings', label: t('nav.settings'), icon: SettingsIcon },
  ];

  const cycleTheme = () => {
    const order: typeof themeMode[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(themeMode);
    setThemeMode(order[(idx + 1) % order.length]);
  };

  const toggleLang = () => setLanguage(i18n.lang === 'en' ? 'vi' : 'en' as Lang);

  const today = new Intl.DateTimeFormat(i18n.locale, {
    weekday: 'short', month: 'short', day: 'numeric',
  }).format(new Date());

  const NavList = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = current === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => {
              onNavigate(item.key as PageKey);
              setMobileNavOpen(false);
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const BrandHeader = () => (
    <div className="flex items-center gap-2 px-3 py-2 mb-4">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white shadow-sm">
        <Plane size={18} />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold text-slate-900 dark:text-white">Phúc Gia Travel</div>
        <div className="text-xs text-slate-400">{t('app.tagline')}</div>
      </div>
    </div>
  );

  const HeaderActions = () => (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleLang}
        aria-label={t('lang.toggle')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
      >
        <Globe size={14} />
        <span className="uppercase">{i18n.lang}</span>
      </button>
      <button
        onClick={cycleTheme}
        aria-label={t('theme.toggle')}
        className="p-2 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
      >
        {effectiveTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
      <div className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium ${
        online ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'
      }`}>
        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span className="hidden sm:inline">{online ? t('common.online') : t('common.offline')}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 fixed inset-y-0 left-0 z-30">
        <BrandHeader />
        <NavList />
        <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="px-3 py-2 flex items-center gap-2 text-xs text-slate-400">
            <Monitor size={12} />
            <span>{today}</span>
          </div>
          {isDemo && (
            <div className="mx-3 mb-2 px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-medium text-center">
              {t('common.demo')} Data
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 p-3 animate-slide-up">
            <div className="flex justify-end mb-2">
              <button onClick={() => setMobileNavOpen(false)} className="p-2 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <BrandHeader />
            <NavList />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 py-3 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300"
                aria-label="Menu"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
                {navItems.find((n) => n.key === current)?.label}
              </h1>
              <span className="hidden sm:inline text-xs text-slate-400">{today}</span>
            </div>
            <HeaderActions />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
