/**
 * Centralized error handling utilities for the frontend
 * Provides consistent error handling patterns across the application
 */

export interface ErrorInfo {
  errorBoundary?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
}

export interface ErrorReport {
  message: string;
  stack?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorInfo;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly isRetryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    isRetryable: boolean = false,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.isRetryable = isRetryable;
    this.details = details;
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string = 'Network request failed',
    details?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', 'high', true, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 'medium', false, { field });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 'high', false);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 'high', false);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error reporting service interface
 */
export interface ErrorReportingService {
  reportError(error: ErrorReport): Promise<void>;
}

/**
 * Console-based error reporting (development)
 */
class ConsoleErrorReporting implements ErrorReportingService {
  async reportError(error: ErrorReport): Promise<void> {
    console.group(`🚨 Error Report [${error.severity.toUpperCase()}]`);
    console.error('Message:', error.message);
    console.error('Type:', error.type);
    console.error('Code:', (error as any).code || 'N/A');
    console.error('Context:', error.context);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    console.groupEnd();
  }
}

/**
 * Production error reporting (to be implemented with external service)
 */
class ProductionErrorReporting implements ErrorReportingService {
  async reportError(error: ErrorReport): Promise<void> {
    try {
      // TODO: Implement integration with Application Insights or similar
      console.warn('Production error reporting not yet implemented');

      // For now, still log to console in production but less verbose
      console.error(`${error.type}: ${error.message}`);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }
}

/**
 * Centralized error handling class
 */
class ErrorHandler {
  private static instance: ErrorHandler;
  private errorReporting: ErrorReportingService;

  private constructor() {
    this.errorReporting =
      process.env.NODE_ENV === 'production'
        ? new ProductionErrorReporting()
        : new ConsoleErrorReporting();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and report errors consistently
   */
  public async handleError(
    error: unknown,
    context?: Partial<ErrorInfo>
  ): Promise<void> {
    const errorReport = this.createErrorReport(error, context);
    await this.errorReporting.reportError(errorReport);
  }

  /**
   * Create standardized error report
   */
  private createErrorReport(
    error: unknown,
    context?: Partial<ErrorInfo>
  ): ErrorReport {
    const baseContext: ErrorInfo = {
      timestamp: new Date().toISOString(),
      userAgent:
        typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      ...context,
    };

    if (error instanceof AppError) {
      return {
        message: error.message,
        stack: error.stack,
        type: error.name,
        severity: error.severity,
        context: baseContext,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        type: error.name,
        severity: 'medium',
        context: baseContext,
      };
    }

    return {
      message: String(error),
      type: 'UnknownError',
      severity: 'medium',
      context: baseContext,
    };
  }

  /**
   * Handle async operation errors with retry logic
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (error instanceof AppError && !error.isRetryable) {
          throw error;
        }

        if (attempt === maxRetries) {
          await this.handleError(error, {
            errorBoundary: 'RetryOperation',
            componentStack: `Final attempt ${attempt}/${maxRetries}`,
          });
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }

    throw lastError;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Utility functions for common error handling patterns
 */

/**
 * Safely handle async operations with error reporting
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  context?: Partial<ErrorInfo>
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    await errorHandler.handleError(error, context);
    return fallback;
  }
}

/**
 * Safely handle sync operations with error reporting
 */
export function safeSync<T>(
  operation: () => T,
  fallback?: T,
  context?: Partial<ErrorInfo>
): T | undefined {
  try {
    return operation();
  } catch (error) {
    // Fire and forget error reporting for sync operations
    errorHandler.handleError(error, context).catch(console.error);
    return fallback;
  }
}

/**
 * Create user-friendly error messages
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  if (error instanceof AuthenticationError) {
    return 'Your session has expired. Please log in again.';
  }

  if (error instanceof AuthorizationError) {
    return 'You do not have permission to perform this action.';
  }

  if (error instanceof ValidationError) {
    return error.message; // Validation errors are usually user-friendly
  }

  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Generic fallback for unknown errors
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }

  return 'An unknown error occurred. Please try again.';
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isRetryable;
  }

  if (error instanceof NetworkError) {
    return true;
  }

  // Default to non-recoverable for unknown errors
  return false;
}
