/**
 * "DNC" = Do Not Call. Lista de telefones que nunca devem ser discados
 * (pedido de exclusão do titular, base de "Não Perturbe" etc.).
 */
export interface DncRepository {
  isBlocked(phoneE164: string): Promise<boolean>;
  add(phoneE164: string, reason: string): Promise<void>;
}
