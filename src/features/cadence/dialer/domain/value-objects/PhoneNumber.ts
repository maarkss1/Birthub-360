/**
 * Value object para número de telefone.
 *
 * Guarda sempre o número normalizado em E.164 (ex: "+5511987654321").
 * A validação assume números brasileiros por padrão (DDD + 8 ou 9 dígitos),
 * mas aceita qualquer número já informado em formato internacional (+<código>...).
 */
export class PhoneNumber {
  private constructor(private readonly e164: string) {}

  static create(raw: string, defaultCountryCode = "55"): PhoneNumber {
    const digits = raw.replace(/\D/g, "");

    if (digits.length === 0) {
      throw new InvalidPhoneNumberError(raw, "número vazio");
    }

    // Já veio com "+" e código de país explícito.
    if (raw.trim().startsWith("+")) {
      if (digits.length < 8 || digits.length > 15) {
        throw new InvalidPhoneNumberError(raw, "quantidade de dígitos inválida para E.164");
      }
      return new PhoneNumber(`+${digits}`);
    }

    // Número nacional brasileiro: DDD (2) + 8 ou 9 dígitos.
    const national = digits.startsWith(defaultCountryCode) && digits.length > 11
      ? digits.slice(defaultCountryCode.length)
      : digits;

    if (national.length !== 10 && national.length !== 11) {
      throw new InvalidPhoneNumberError(
        raw,
        "número nacional deve ter 10 dígitos (fixo) ou 11 dígitos (celular), incluindo DDD",
      );
    }

    const ddd = national.slice(0, 2);
    if (Number.parseInt(ddd, 10) < 11) {
      throw new InvalidPhoneNumberError(raw, "DDD inválido");
    }

    return new PhoneNumber(`+${defaultCountryCode}${national}`);
  }

  /** Tenta criar o value object; retorna `null` em vez de lançar em caso de número inválido. */
  static tryCreate(raw: string, defaultCountryCode = "55"): PhoneNumber | null {
    try {
      return PhoneNumber.create(raw, defaultCountryCode);
    } catch {
      return null;
    }
  }

  toE164(): string {
    return this.e164;
  }

  /** Chave de comparação/deduplicação estável (independe de formatação). */
  toKey(): string {
    return this.e164;
  }

  equals(other: PhoneNumber): boolean {
    return this.e164 === other.e164;
  }

  toString(): string {
    return this.e164;
  }
}

export class InvalidPhoneNumberError extends Error {
  constructor(raw: string, reason: string) {
    super(`Número de telefone inválido "${raw}": ${reason}`);
    this.name = "InvalidPhoneNumberError";
  }
}
