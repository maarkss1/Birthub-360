export interface LogTraceContext {
  traceId?: string;
  spanId?: string;
  organizationId?: string;
  userId?: string;
}

export interface StructuredLogPayload {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  service: string;
  traceContext: LogTraceContext;
  extra?: Record<string, unknown>;
}

export class OpenTelemetryPinoLogger {
  private serviceName: string;

  constructor(serviceName = 'prospector-atlas-api') {
    this.serviceName = serviceName;
  }

  formatLog(
    level: StructuredLogPayload['level'],
    message: string,
    context: LogTraceContext = {},
    extra?: Record<string, unknown>
  ): StructuredLogPayload {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      traceContext: {
        traceId: context.traceId || 'trace-0000000000000000',
        spanId: context.spanId || 'span-00000000',
        organizationId: context.organizationId || 'org-global',
        userId: context.userId,
      },
      extra,
    };
  }

  info(message: string, context?: LogTraceContext, extra?: Record<string, unknown>) {
    return this.formatLog('info', message, context, extra);
  }

  error(message: string, context?: LogTraceContext, extra?: Record<string, unknown>) {
    return this.formatLog('error', message, context, extra);
  }
}

export const openTelemetryPinoLogger = new OpenTelemetryPinoLogger();
