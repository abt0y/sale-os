// WebMCP capability adapter with feature detection and fallback.
// Does NOT fabricate browser-native registration. Uses an internal registry
// for app interactions and reports real browser support status.

export interface WebMcpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  mutating: boolean;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface WebMcpStatus {
  supported: boolean;
  apiName: string | null;
  registeredCount: number;
  detail: string;
}

type RegisterFn = (def: {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}) => Promise<{ invoke: (args: Record<string, unknown>) => Promise<unknown> }>;

interface ModelContextLike {
  registerTool: RegisterFn;
}

function detectApi(): { api: ModelContextLike | null; name: string | null } {
  const nav = navigator as unknown as Record<string, unknown>;
  if (nav.modelContext && typeof (nav.modelContext as ModelContextLike).registerTool === 'function') {
    return { api: nav.modelContext as ModelContextLike, name: 'navigator.modelContext' };
  }
  return { api: null, name: null };
}

class WebMcpAdapter {
  private tools = new Map<string, WebMcpToolDef>();
  private api: ModelContextLike | null = null;
  private apiName: string | null = null;
  private registered = false;

  constructor() {
    if (typeof navigator !== 'undefined') {
      const det = detectApi();
      this.api = det.api;
      this.apiName = det.name;
    }
  }

  registerTool(def: WebMcpToolDef): void {
    this.tools.set(def.name, def);
  }

  unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  async tryRegisterAll(): Promise<boolean> {
    if (!this.api) return false;
    try {
      for (const def of this.tools.values()) {
        await this.api.registerTool({
          name: def.name,
          description: def.description,
          inputSchema: def.inputSchema,
        });
      }
      this.registered = true;
      return true;
    } catch {
      this.registered = false;
      return false;
    }
  }

  async invoke(name: string, args: Record<string, unknown>): Promise<unknown> {
    const def = this.tools.get(name);
    if (!def) throw new Error(`Unknown tool: ${name}`);
    return def.handler(args);
  }

  status(): WebMcpStatus {
    return {
      supported: !!this.api,
      apiName: this.apiName,
      registeredCount: this.tools.size,
      detail: this.api
        ? `Browser exposes ${this.apiName}. ${this.registered ? 'Registered.' : 'Not registered.'}`
        : 'WebMCP not supported in this browser. Internal registry only.',
    };
  }

  listTools(): WebMcpToolDef[] {
    return Array.from(this.tools.values());
  }
}

export const webmcp = new WebMcpAdapter();
