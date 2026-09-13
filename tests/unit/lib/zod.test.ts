import { describe, it, expect, vi } from 'vitest';
import { companySchema, contactSchema } from '@/lib/zod';

describe('Zod Schemas', () => {
  describe('companySchema', () => {
    it('should validate valid company', () => {
      const validCompany = {
        legalName: 'Test Corp',
        tradeName: 'Test',
      };
      const result = companySchema.safeParse(validCompany);
      expect(result.success).toBe(true);
    });

    it('should reject company without legalName', () => {
      const invalid = { tradeName: 'Test', legalName: '' };
      const result = companySchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Razão Social é obrigatória');
      }
    });
  });

  describe('contactSchema', () => {
    it('should validate valid contact', () => {
      const validContact = {
        name: 'John Doe',
        companyId: '123',
      };
      const result = contactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalid = {
        name: 'John Doe',
        companyId: '123',
        email: 'invalid-email',
      };
      const result = contactSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('E-mail inválido');
      }
    });
  });
});
