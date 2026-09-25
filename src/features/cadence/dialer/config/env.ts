import { z } from "zod";

/**
 * Converte "101,102,103" em ["101", "102", "103"], removendo espaços e
 * entradas vazias. Usado para listas simples vindas de variáveis de ambiente.
 */
function csv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),

  THREECX_DOMAIN: z.string().min(1, "THREECX_DOMAIN é obrigatório"),
  THREECX_CLIENT_ID: z.string().min(1, "THREECX_CLIENT_ID é obrigatório"),
  THREECX_API_KEY: z.string().min(1, "THREECX_API_KEY é obrigatório"),
  THREECX_AGENT_DNS: z
    .string()
    .min(1, "THREECX_AGENT_DNS é obrigatório (ex: 101,102,103)")
    .transform(csv),
  THREECX_CALL_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(25),
  THREECX_HTTP_RETRY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  THREECX_CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(5),
  THREECX_CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number().int().positive().default(30_000),

  DIALER_TICK_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  DIALER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  DIALER_RETRY_BACKOFF_MINUTES: z.coerce.number().int().positive().default(60),

  DIALER_CALLING_HOURS_START: z.string().regex(timeRegex).default("08:00"),
  DIALER_CALLING_HOURS_END: z.string().regex(timeRegex).default("20:00"),
  DIALER_CALLING_DAYS: z
    .string()
    .default("1,2,3,4,5,6")
    .transform((value) => csv(value).map((day) => Number.parseInt(day, 10))),
  DIALER_TIMEZONE: z.string().default("America/Sao_Paulo"),
});

export type Env = Readonly<{
  port: number;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  databaseUrl: string;
  threeCx: Readonly<{
    domain: string;
    clientId: string;
    apiKey: string;
    agentDns: readonly string[];
    callTimeoutSeconds: number;
    httpRetryMaxAttempts: number;
    circuitBreakerFailureThreshold: number;
    circuitBreakerCooldownMs: number;
  }>;
  dialer: Readonly<{
    tickIntervalMs: number;
    maxAttempts: number;
    retryBackoffMinutes: number;
    callingHoursStart: string;
    callingHoursEnd: string;
    callingDays: readonly number[];
    timezone: string;
  }>;
}>;

/**
 * Faz o parse e a validação de `process.env`. Lança um erro descritivo
 * (em vez de deixar o app subir com configuração inválida) caso alguma
 * variável obrigatória esteja ausente ou mal formatada.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }

  const data = parsed.data;

  return {
    port: data.PORT,
    logLevel: data.LOG_LEVEL,
    databaseUrl: data.DATABASE_URL,
    threeCx: {
      domain: data.THREECX_DOMAIN,
      clientId: data.THREECX_CLIENT_ID,
      apiKey: data.THREECX_API_KEY,
      agentDns: data.THREECX_AGENT_DNS,
      callTimeoutSeconds: data.THREECX_CALL_TIMEOUT_SECONDS,
      httpRetryMaxAttempts: data.THREECX_HTTP_RETRY_MAX_ATTEMPTS,
      circuitBreakerFailureThreshold: data.THREECX_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      circuitBreakerCooldownMs: data.THREECX_CIRCUIT_BREAKER_COOLDOWN_MS,
    },
    dialer: {
      tickIntervalMs: data.DIALER_TICK_INTERVAL_MS,
      maxAttempts: data.DIALER_MAX_ATTEMPTS,
      retryBackoffMinutes: data.DIALER_RETRY_BACKOFF_MINUTES,
      callingHoursStart: data.DIALER_CALLING_HOURS_START,
      callingHoursEnd: data.DIALER_CALLING_HOURS_END,
      callingDays: data.DIALER_CALLING_DAYS,
      timezone: data.DIALER_TIMEZONE,
    },
  };
}
