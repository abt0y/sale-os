import { rankTasks } from '@/domain/scoring';
import { summarizeRevenue } from '@/domain/calculations';
import { buildWhatsAppDraft } from '@/integrations/whatsapp';
import { webmcp } from '@/webmcp/adapter';
import { useApp } from '@/store/AppContext';

type AppState = ReturnType<typeof useApp>;
type AppStateGetter = () => AppState;
const stringArg = (args: Record<string, unknown>, key: string): string => typeof args[key] === 'string' ? args[key] as string : '';

export function registerSalesTools(getApp: AppStateGetter): Promise<boolean> {
  webmcp.registerTool({
    name: 'list_priority_tasks',
    description: 'List open sales tasks ranked by deterministic priority score.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    mutating: false,
    handler: async () => {
      const app = getApp();
      return rankTasks(app.tasks, {
        p0Threshold: app.settings?.p0Threshold ?? 80,
        p1Threshold: app.settings?.p1Threshold ?? 50,
      }).map(({ task, totalScore, priority, explanation, recommendedAction, components }) => ({
        taskId: task.taskId, title: task.title, priority, totalScore, explanation, recommendedAction,
        components: components.map(({ key, score, max }) => ({ key, score, max })),
      }));
    },
  });

  webmcp.registerTool({
    name: 'get_lead_summary',
    description: 'Return a concise local summary for a lead by ID.',
    inputSchema: { type: 'object', properties: { leadId: { type: 'string' } }, required: ['leadId'], additionalProperties: false },
    mutating: false,
    handler: async (args) => {
      const lead = getApp().leads.find((item) => item.leadId === stringArg(args, 'leadId'));
      if (!lead) return { error: 'Lead not found' };
      return {
        leadId: lead.leadId, clientName: lead.clientName, destination: lead.destination,
        partySize: lead.partySize, budget: lead.budget, currency: lead.currency,
        stage: lead.stage, priorityScore: lead.priorityScore, nextActionAt: lead.nextActionAt,
      };
    },
  });

  webmcp.registerTool({
    name: 'calculate_revenue_gap',
    description: 'Calculate local revenue attainment and remaining target gap.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    mutating: false,
    handler: async () => {
      const app = getApp();
      if (!app.agent || !app.settings) return { error: 'Agent settings unavailable' };
      const summary = summarizeRevenue(app.agent, app.leads, app.bookings, app.settings);
      return {
        target: app.agent.monthlyRevenueTarget,
        confirmedRevenue: summary.confirmedRevenue,
        revenueGap: summary.revenueGap,
        attainmentPct: summary.attainmentPct,
        requiredDailyPace: summary.requiredPace,
        currency: app.settings.reportingCurrency,
      };
    },
  });

  webmcp.registerTool({
    name: 'draft_whatsapp_followup',
    description: 'Draft a WhatsApp follow-up locally; does not send the message.',
    inputSchema: {
      type: 'object', properties: { leadId: { type: 'string' }, phone: { type: 'string' } },
      required: ['leadId', 'phone'], additionalProperties: false,
    },
    mutating: false,
    handler: async (args) => {
      const app = getApp();
      const lead = app.leads.find((item) => item.leadId === stringArg(args, 'leadId'));
      if (!lead) return { error: 'Lead not found' };
      return buildWhatsAppDraft(lead, stringArg(args, 'phone'), app.agent?.name ?? '', app.i18n.lang);
    },
  });

  webmcp.registerTool({
    name: 'mark_task_complete',
    description: 'Mark a local sales task complete by ID.',
    inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'], additionalProperties: false },
    mutating: true,
    handler: async (args) => {
      const app = getApp();
      const task = app.tasks.find((item) => item.taskId === stringArg(args, 'taskId'));
      if (!task) return { error: 'Task not found' };
      await app.saveTask({ ...task, status: 'Completed', completedAt: new Date().toISOString() });
      return { ok: true, taskId: task.taskId, status: 'Completed' };
    },
  });

  return webmcp.tryRegisterAll();
}
