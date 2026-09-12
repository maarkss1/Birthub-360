import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DS_TOKENS, DS_CLASSES } from '@/lib/designSystem';
import { BentoGrid, BentoCard, BentoMetric, BentoHero, BentoInsight } from '@/components/ui/bento';
import { FloatingDock } from '@/components/layout/FloatingDock';
import { PageTransition } from '@/components/layout/PageTransition';
import {
  Skeleton,
  MetricSkeleton,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  ChartSkeleton,
} from '@/components/ui/Skeleton';

describe('Onda 1 — Design System Foundation & Core Components', () => {
  describe('Prompt 01: Design System Tokens', () => {
    it('should define canonical radii and elevation tokens according to the brand manual', () => {
      expect(DS_TOKENS.radii.default).toBe('12px');
      expect(DS_TOKENS.elevation.commandPalette).toBe(60);
      expect(DS_CLASSES.glass).toBe('bh-glass');
      expect(DS_CLASSES.card).toBe('bh-card');
      expect(DS_CLASSES.states.active).toBe('bh-state-active');
      expect(DS_CLASSES.skeleton).toBe('bh-skeleton-shimmer');
    });
  });

  describe('Prompt 02: Bento Grid Suite', () => {
    it('should render BentoGrid with responsive column classes', () => {
      const { container } = render(
        <BentoGrid columns={4} data-testid="bento-grid">
          <BentoCard>Card 1</BentoCard>
          <BentoCard colSpan={2}>Card 2</BentoCard>
        </BentoGrid>,
      );
      expect(container.firstChild).toHaveClass('grid');
      expect(container.firstChild).toHaveClass('lg:grid-cols-4');
      expect(screen.getByText('Card 1')).toBeInTheDocument();
      expect(screen.getByText('Card 2')).toBeInTheDocument();
    });

    it('should render BentoMetric with value and delta', () => {
      render(
        <BentoMetric
          title="Taxa de Conversão"
          value="24.8%"
          delta={{ value: '+3.2%', positive: true }}
          subtitle="eficiência comercial"
        />,
      );
      expect(screen.getByText('Taxa de Conversão')).toBeInTheDocument();
      expect(screen.getByText('24.8%')).toBeInTheDocument();
      expect(screen.getByText(/3.2%/)).toBeInTheDocument();
      expect(screen.getByText('eficiência comercial')).toBeInTheDocument();
    });

    it('should render BentoHero with badge, title and description', () => {
      render(
        <BentoHero
          badge="Destaque"
          title="Centro de Inteligência"
          description="Visão executiva unificada do pipeline comercial"
        />,
      );
      expect(screen.getByText('Destaque')).toBeInTheDocument();
      expect(screen.getByText('Centro de Inteligência')).toBeInTheDocument();
      expect(screen.getByText(/Visão executiva/)).toBeInTheDocument();
    });

    it('should render BentoInsight with category and recommendation', () => {
      render(
        <BentoInsight
          category="Radar de Oportunidades"
          title="Lead de Alto Potencial"
          recommendation="Empresa com faturamento acima de R$ 50M sem contato há 15 dias"
          actionText="Qualificar agora"
          priority="high"
        />,
      );
      expect(screen.getByText('Radar de Oportunidades')).toBeInTheDocument();
      expect(screen.getByText('Lead de Alto Potencial')).toBeInTheDocument();
      expect(screen.getByText(/Empresa com faturamento/)).toBeInTheDocument();
      expect(screen.getByText(/Qualificar agora/)).toBeInTheDocument();
      expect(screen.getByText('Prioritário')).toBeInTheDocument();
    });
  });

  describe('Prompt 04: FloatingDock Mobile', () => {
    it('should render mobile quick navigation items and menu action', () => {
      render(
        <MemoryRouter>
          <FloatingDock activeTab="dashboard" onOpenFullMenu={() => {}} />
        </MemoryRouter>,
      );
      expect(screen.getByRole('navigation', { name: /navegação rápida/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /painel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /captar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });
  });

  describe('Prompt 05: PageTransition', () => {
    it('should render children within the transition container', () => {
      render(
        <PageTransition id="test-page">
          <div>Conteúdo de Teste</div>
        </PageTransition>,
      );
      expect(screen.getByText('Conteúdo de Teste')).toBeInTheDocument();
    });
  });

  describe('Prompt 06: Skeleton Loaders', () => {
    it('should render base Skeleton and structured variants', () => {
      const { container } = render(
        <div>
          <Skeleton className="h-4 w-10" />
          <MetricSkeleton />
          <CardSkeleton />
          <TableSkeleton rows={2} cols={2} />
          <ListSkeleton items={2} />
          <ChartSkeleton />
        </div>,
      );
      expect(container.querySelectorAll('.bh-skeleton-shimmer').length).toBeGreaterThan(5);
    });
  });
});
