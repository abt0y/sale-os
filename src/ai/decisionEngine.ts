import type { GsdTask } from '@/domain/types';
import type { ScoredTask } from '@/domain/scoring';
import { rankTasks, DEFAULT_SCORE_CONFIG, type ScoreConfig } from '@/domain/scoring';

export interface DecisionContext {
  agentId: string;
  now: Date;
}

export interface DecisionResult {
  ranked: ScoredTask[];
  engine: 'deterministic' | 'onnx';
  latencyMs: number;
  modelAvailable: boolean;
  warnings: string[];
}

export interface DecisionEngine {
  name: 'deterministic' | 'onnx';
  available: boolean;
  rank(tasks: GsdTask[], context: DecisionContext, config?: ScoreConfig): Promise<DecisionResult>;
  status(): { available: boolean; detail: string };
}

export class DeterministicDecisionEngine implements DecisionEngine {
  name = 'deterministic' as const;
  available = true;

  async rank(
    tasks: GsdTask[],
    _context: DecisionContext,
    config: ScoreConfig = DEFAULT_SCORE_CONFIG,
  ): Promise<DecisionResult> {
    const t0 = performance.now();
    const ranked = rankTasks(tasks, config);
    const t1 = performance.now();
    return {
      ranked,
      engine: 'deterministic',
      latencyMs: t1 - t0,
      modelAvailable: true,
      warnings: [],
    };
  }

  status() {
    return { available: true, detail: 'Deterministic engine — always available.' };
  }
}

/**
 * Optional ONNX adapter. Ships disabled by default.
 * Will only enable after a model is provided at /models/laya_rank.onnx and validation passes.
 * Never fabricates inference — falls back to deterministic if unavailable.
 */
export class OnnxDecisionEngine implements DecisionEngine {
  name = 'onnx' as const;
  available = false;
  private modelPath: string;
  private session: unknown = null;
  private initError: string | null = null;

  constructor(modelPath = '/models/laya_rank.onnx') {
    this.modelPath = modelPath;
  }

  async initialize(): Promise<boolean> {
    try {
      // Check model availability via HEAD
      const res = await fetch(this.modelPath, { method: 'HEAD' });
      if (!res.ok) {
        this.initError = `Model not found at ${this.modelPath}`;
        this.available = false;
        return false;
      }
      // Dynamically import onnxruntime-web only if model exists
      const ort = await import('onnxruntime-web').catch(() => null);
      if (!ort) {
        this.initError = 'onnxruntime-web not installed';
        this.available = false;
        return false;
      }
      const backend = ort.env ? (ort.env.wasm ? 'wasm' : 'webgpu') : 'wasm';
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['webgpu', 'wasm'],
      });
      this.available = !!this.session;
      void backend;
      return this.available;
    } catch (e) {
      this.initError = e instanceof Error ? e.message : String(e);
      this.available = false;
      return false;
    }
  }

  async rank(
    tasks: GsdTask[],
    context: DecisionContext,
    config: ScoreConfig = DEFAULT_SCORE_CONFIG,
  ): Promise<DecisionResult> {
    // Fallback to deterministic if not initialized
    if (!this.available || !this.session) {
      const det = new DeterministicDecisionEngine();
      const r = await det.rank(tasks, context, config);
      return {
        ...r,
        engine: 'deterministic',
        warnings: ['ONNX unavailable — using deterministic fallback.', this.initError ?? ''].filter(Boolean),
      };
    }
    // Real inference path would preprocess tasks into model input tensors here.
    // Until a validated Laya model is supplied, we keep this as an explicit
    // not-configured state and never simulate inference.
    const det = new DeterministicDecisionEngine();
    const r = await det.rank(tasks, context, config);
    return {
      ...r,
      warnings: ['ONNX initialized but inference adapter not wired — using deterministic baseline.'],
    };
  }

  status() {
    return {
      available: this.available,
      detail: this.available ? 'ONNX model loaded' : `Not configured: ${this.initError ?? 'model missing'}`,
    };
  }
}

export function createEngine(kind: 'deterministic' | 'onnx'): DecisionEngine {
  if (kind === 'onnx') return new OnnxDecisionEngine();
  return new DeterministicDecisionEngine();
}
