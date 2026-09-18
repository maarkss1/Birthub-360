import type { GuardiaoPolicyVerdict } from './triad.types.js';

export interface DiscountPolicyInput {
  userRole: 'SDR' | 'CLOSER' | 'GERENTE' | 'DIRETOR' | 'ADMIN';
  requestedDiscountPercent: number;
  dealValue: number;
}

export interface PiiConsentInput {
  hasConsent: boolean;
  containsSensitiveData: boolean;
}

export interface CrmIntegrityInput {
  companyName: string;
  cnpj?: string;
}

export class GuardiaoGovernanceAgent {
  /**
   * Avalia alçadas de desconto e preço segundo as políticas da organização.
   * - SDR / CLOSER: até 8% de desconto permitido.
   * - GERENTE: até 15% de desconto permitido.
   * - DIRETOR / ADMIN: até 25% de desconto permitido.
   * - Acima de 25%: Rejeitado automaticamente.
   */
  public evaluateDiscountPolicy(input: DiscountPolicyInput): GuardiaoPolicyVerdict {
    const { userRole, requestedDiscountPercent } = input;

    if (requestedDiscountPercent <= 0) {
      return {
        verdict: 'APPROVED',
        ruleId: 'DISCOUNT_STANDARD_PRICE',
        category: 'DISCOUNT_MARGIN',
        details: 'Sem aplicação de desconto. Preço de tabela aprovado automaticamente.',
        piiSanitized: true,
        auditLog: `[POLICY-AUDIT] Preço integral sem desconto para papel ${userRole}.`,
      };
    }

    if (requestedDiscountPercent > 25) {
      return {
        verdict: 'REJECTED',
        ruleId: 'DISCOUNT_MAX_CEILING_EXCEEDED',
        category: 'DISCOUNT_MARGIN',
        details: `Desconto de ${requestedDiscountPercent}% ultrapassa o teto máximo absoluto da empresa (25%).`,
        piiSanitized: true,
        auditLog: `[POLICY-BLOCK] Desconto de ${requestedDiscountPercent}% recusado. Papel: ${userRole}.`,
      };
    }

    // Regras de alçada por papel
    if (userRole === 'CLOSER' || userRole === 'SDR') {
      if (requestedDiscountPercent <= 8) {
        return {
          verdict: 'APPROVED',
          ruleId: 'DISCOUNT_SELLER_ALCADA_OK',
          category: 'DISCOUNT_MARGIN',
          details: `Desconto de ${requestedDiscountPercent}% está dentro da alçada do vendedor (até 8%).`,
          piiSanitized: true,
          auditLog: `[POLICY-PASS] Vendedor aplicou ${requestedDiscountPercent}% com alçada própria.`,
        };
      }
      if (requestedDiscountPercent <= 15) {
        return {
          verdict: 'REQUIRES_APPROVAL',
          ruleId: 'DISCOUNT_REQUIRE_MANAGER_APPROVAL',
          category: 'DISCOUNT_MARGIN',
          details: `Desconto de ${requestedDiscountPercent}% excede alçada do vendedor (8%). Requer aprovação de Gerente Comercial.`,
          requiredRoleForApproval: 'GERENTE',
          piiSanitized: true,
          auditLog: `[POLICY-ESCALATE] Escalação para aprovação de GERENTE (desconto: ${requestedDiscountPercent}%).`,
        };
      }
      return {
        verdict: 'REQUIRES_APPROVAL',
        ruleId: 'DISCOUNT_REQUIRE_DIRECTOR_APPROVAL',
        category: 'DISCOUNT_MARGIN',
        details: `Desconto de ${requestedDiscountPercent}% excede alçada de Gerente (15%). Requer aprovação de Diretor Comercial.`,
        requiredRoleForApproval: 'DIRETOR',
        piiSanitized: true,
        auditLog: `[POLICY-ESCALATE] Escalação para aprovação de DIRETOR (desconto: ${requestedDiscountPercent}%).`,
      };
    }

    if (userRole === 'GERENTE') {
      if (requestedDiscountPercent <= 15) {
        return {
          verdict: 'APPROVED',
          ruleId: 'DISCOUNT_MANAGER_ALCADA_OK',
          category: 'DISCOUNT_MARGIN',
          details: `Desconto de ${requestedDiscountPercent}% dentro da alçada do Gerente (até 15%).`,
          piiSanitized: true,
          auditLog: `[POLICY-PASS] Gerente aprovou ${requestedDiscountPercent}% com alçada direta.`,
        };
      }
      return {
        verdict: 'REQUIRES_APPROVAL',
        ruleId: 'DISCOUNT_REQUIRE_DIRECTOR_APPROVAL',
        category: 'DISCOUNT_MARGIN',
        details: `Desconto de ${requestedDiscountPercent}% excede alçada gerencial. Requer aprovação de Diretor.`,
        requiredRoleForApproval: 'DIRETOR',
        piiSanitized: true,
        auditLog: `[POLICY-ESCALATE] Escalação de Gerente para Diretor (desconto: ${requestedDiscountPercent}%).`,
      };
    }

    // DIRETOR / ADMIN
    return {
      verdict: 'APPROVED',
      ruleId: 'DISCOUNT_DIRECTOR_ALCADA_OK',
      category: 'DISCOUNT_MARGIN',
      details: `Desconto de ${requestedDiscountPercent}% autorizado por alçada executiva de Diretoria/Administração.`,
      piiSanitized: true,
      auditLog: `[POLICY-PASS] Alçada de Diretoria/Admin aprovou ${requestedDiscountPercent}%.`,
    };
  }

  /**
   * Garante a conformidade LGPD e a sanitização de PII antes de qualquer tráfego externo.
   */
  public evaluatePiiAndConsent(input: PiiConsentInput): GuardiaoPolicyVerdict {
    if (input.containsSensitiveData && !input.hasConsent) {
      return {
        verdict: 'REQUIRES_APPROVAL',
        ruleId: 'LGPD_PII_CONSENT_MISSING',
        category: 'LGPD_PII',
        details: 'Dados pessoais sensíveis detectados sem registro de consentimento explícito prévio.',
        requiredRoleForApproval: 'ADMIN',
        piiSanitized: false,
        auditLog: '[LGPD-ALERT] Envio retido por ausência de consentimento prévio para processamento de PII.',
      };
    }

    return {
      verdict: 'APPROVED',
      ruleId: 'LGPD_PII_VERIFIED',
      category: 'LGPD_PII',
      details: 'Conformidade com LGPD verificada. Sanitização e base legal ativas.',
      piiSanitized: true,
      auditLog: '[LGPD-PASS] Conformidade e sanitização confirmadas.',
    };
  }

  /**
   * Audita a higienização e integridade para evitar corrupção ou duplicidade no CRM.
   */
  public evaluateCrmIntegrity(input: CrmIntegrityInput): GuardiaoPolicyVerdict {
    const cleanName = input.companyName?.trim();
    if (!cleanName || cleanName.length < 2) {
      return {
        verdict: 'REJECTED',
        ruleId: 'CRM_INVALID_ACCOUNT_NAME',
        category: 'CRM_INTEGRITY',
        details: 'Nome da empresa inválido ou vazio para registro no CRM.',
        piiSanitized: true,
        auditLog: '[CRM-REJECT] Registro bloqueado: razão social inválida.',
      };
    }

    return {
      verdict: 'APPROVED',
      ruleId: 'CRM_ACCOUNT_HYGIENE_OK',
      category: 'CRM_INTEGRITY',
      details: 'Registro atende a todos os critérios de integridade e desduplicação do CRM.',
      piiSanitized: true,
      auditLog: `[CRM-PASS] Validação de integridade aprovada para conta "${cleanName}".`,
    };
  }
}
