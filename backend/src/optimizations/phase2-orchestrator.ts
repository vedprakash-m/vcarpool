import { InvocationContext } from '@azure/functions';

/**
 * Global orchestrator for Phase 2 optimizations
 */
class Phase2Orchestrator {
  private static instance: Phase2Orchestrator;
  private optimizationMetrics: Map<string, any> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): Phase2Orchestrator {
    if (!Phase2Orchestrator.instance) {
      Phase2Orchestrator.instance = new Phase2Orchestrator();
    }
    return Phase2Orchestrator.instance;
  }

  /**
   * Initialize the orchestrator
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize optimization subsystems
      await this.initializeMetrics();
      await this.initializePerformanceMonitoring();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Phase2Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Record optimization metrics
   */
  public recordMetric(key: string, value: any): void {
    this.optimizationMetrics.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current metrics
   */
  public getMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    this.optimizationMetrics.forEach((data, key) => {
      metrics[key] = data;
    });
    return metrics;
  }

  /**
   * Optimize a function execution
   */
  public async optimize(
    functionName: string,
    context: InvocationContext,
    execution: () => Promise<any>,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Pre-execution optimizations
      await this.preOptimize(functionName, context);

      // Execute the function
      const result = await execution();

      // Post-execution optimizations
      await this.postOptimize(functionName, context, Date.now() - startTime);

      return result;
    } catch (error) {
      await this.handleOptimizationError(functionName, error);
      throw error;
    }
  }

  private async initializeMetrics(): Promise<void> {
    // Initialize metrics collection
    this.recordMetric('orchestrator_initialized', true);
  }

  private async initializePerformanceMonitoring(): Promise<void> {
    // Initialize performance monitoring
    this.recordMetric('performance_monitoring_enabled', true);
  }

  private async preOptimize(functionName: string, context: InvocationContext): Promise<void> {
    this.recordMetric(`${functionName}_start`, Date.now());
    context.extraInputs?.set('optimization_enabled', true);
  }

  private async postOptimize(
    functionName: string,
    context: InvocationContext,
    duration: number,
  ): Promise<void> {
    this.recordMetric(`${functionName}_duration`, duration);
    this.recordMetric(`${functionName}_end`, Date.now());
  }

  private async handleOptimizationError(functionName: string, error: any): Promise<void> {
    this.recordMetric(`${functionName}_error`, {
      message: error.message,
      timestamp: Date.now(),
    });
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): Record<string, any> {
    const performanceMetrics: Record<string, any> = {};
    this.optimizationMetrics.forEach((data, key) => {
      if (key.includes('_duration') || key.includes('_start') || key.includes('_end')) {
        performanceMetrics[key] = data;
      }
    });
    return performanceMetrics;
  }

  /**
   * Clear cache and metrics
   */
  public clearCache(): void {
    this.optimizationMetrics.clear();
    this.recordMetric('cache_cleared', true);
  }
}

/**
 * Get the global orchestrator instance
 */
export function getGlobalOrchestrator(): Phase2Orchestrator {
  return Phase2Orchestrator.getInstance();
}

/**
 * Initialize the global orchestrator
 */
export async function initializeGlobalOrchestrator(): Promise<void> {
  const orchestrator = getGlobalOrchestrator();
  await orchestrator.initialize();
}
