import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { companyRoutes } from '@/features/companies/routes/company.routes';
import { container } from '@/shared/di/container';
import { CompanyController } from '@/features/companies/presentation/CompanyController';
import { errorHandler } from '@/shared/middlewares/errorHandler';

const mockCompanyController = {
  getCompanies: vi.fn(),
  getCompanyById: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn(),
  enrichCompany: vi.fn(),
};

vi.spyOn(container, 'resolve').mockImplementation((name: string) => {
  if (name === 'CompanyController') return mockCompanyController;
  throw new Error(`Dependency ${name} not found`);
});

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  (req as any).user = { id: 'test-user', organizationId: 'test-org-id', role: 'ADMIN' };

  next();
});
app.use('/api/companies', companyRoutes);
app.use(errorHandler);

describe('Company Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/companies should return companies', async () => {
    mockCompanyController.getCompanies.mockImplementation(async (req, res) => {
      res.json({ success: true, data: [{ id: '1', legalName: 'Test' }], meta: {} });
    });

    const res = await request(app).get('/api/companies');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ id: '1', legalName: 'Test' }]);
  });

  it('GET /api/companies/:id should return a company', async () => {
    mockCompanyController.getCompanyById.mockImplementation(async (req, res) => {
      res.json({ success: true, data: { id: '1', legalName: 'Test' } });
    });

    const res = await request(app).get('/api/companies/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: '1', legalName: 'Test' });
  });

  it('POST /api/companies should create a company', async () => {
    mockCompanyController.createCompany.mockImplementation(async (req, res) => {
      res
        .status(201)
        .json({ success: true, data: { id: '1', legalName: 'New Corp', tradeName: 'Corp' } });
    });

    const res = await request(app)
      .post('/api/companies')
      .send({ legalName: 'New Corp', tradeName: 'Corp' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: '1', legalName: 'New Corp', tradeName: 'Corp' });
  });

  it('POST /api/companies should fail validation without legalName', async () => {
    const res = await request(app).post('/api/companies').send({ tradeName: 'Corp' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Erro de Validação');
  });

  it('PUT /api/companies/:id should update a company', async () => {
    mockCompanyController.updateCompany.mockImplementation(async (req, res) => {
      res
        .status(200)
        .json({ success: true, data: { id: '1', legalName: 'Updated', tradeName: 'Corp' } });
    });

    const res = await request(app).put('/api/companies/1').send({ legalName: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/companies/:id should delete a company', async () => {
    mockCompanyController.deleteCompany.mockImplementation(async (req, res) => {
      res.status(204).send();
    });

    // Override default user to have ADMIN role for this specific test
    const adminApp = express();
    adminApp.use(express.json());
    adminApp.use((req, res, next) => {
      (req as any).user = { id: 'test-admin', organizationId: 'test-org-id', role: 'ADMIN' };
      next();
    });
    adminApp.use('/api/companies', companyRoutes);
    adminApp.use(errorHandler);

    const res = await request(adminApp).delete('/api/companies/1');
    expect(res.status).toBe(204);
  });
});
