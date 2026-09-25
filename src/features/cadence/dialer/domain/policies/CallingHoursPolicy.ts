export interface CallingHoursConfig {
  /** "HH:MM" em horário local. */
  start: string;
  /** "HH:MM" em horário local. */
  end: string;
  /** 0 = domingo ... 6 = sábado. */
  allowedWeekdays: readonly number[];
  /** IANA timezone (ex: "America/Sao_Paulo"). Se não informado, usa o timezone local do processo. */
  timezone?: string;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseMinutesSinceMidnight(hhmm: string): number {
  const [hoursRaw, minutesRaw] = hhmm.split(":");
  const hours = Number.parseInt(hoursRaw ?? "0", 10);
  const minutes = Number.parseInt(minutesRaw ?? "0", 10);
  return hours * 60 + minutes;
}

/**
 * Decide se o horário atual está dentro da janela permitida para discagem
 * ativa. Não é, por si só, uma garantia de conformidade legal — apenas o
 * mecanismo técnico que aplica os limites que você configurar (ver
 * README, seção "Conformidade legal", para os parâmetros usuais no Brasil).
 */
export class CallingHoursPolicy {
  constructor(private readonly config: CallingHoursConfig) {}

  isAllowedAt(date: Date): boolean {
    const { weekday, minutes } = this.getZonedParts(date);

    if (!this.config.allowedWeekdays.includes(weekday)) {
      return false;
    }

    const startMinutes = parseMinutesSinceMidnight(this.config.start);
    const endMinutes = parseMinutesSinceMidnight(this.config.end);

    if (startMinutes <= endMinutes) {
      return minutes >= startMinutes && minutes < endMinutes;
    }

    // Janela que atravessa a meia-noite (ex: 22:00 -> 02:00).
    return minutes >= startMinutes || minutes < endMinutes;
  }

  private getZonedParts(date: Date): { weekday: number; minutes: number } {
    if (!this.config.timezone) {
      return {
        weekday: date.getDay(),
        minutes: date.getHours() * 60 + date.getMinutes(),
      };
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: this.config.timezone,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    let weekdayStr = "Sun";
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === "weekday") weekdayStr = part.value;
      else if (part.type === "hour") hour = Number.parseInt(part.value, 10) % 24;
      else if (part.type === "minute") minute = Number.parseInt(part.value, 10);
    }

    return {
      weekday: WEEKDAY_MAP[weekdayStr] ?? date.getDay(),
      minutes: hour * 60 + minute,
    };
  }
}
