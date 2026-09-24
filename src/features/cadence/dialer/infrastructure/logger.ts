import pino from "pino";

export function createLogger(level: string): pino.Logger {
  const isProduction = process.env["NODE_ENV"] === "production";

  if (isProduction) {
    return pino({ level });
  }

  return pino({
    level,
    transport: { target: "pino-pretty", options: { colorize: true } },
  });
}

export type Logger = pino.Logger;
