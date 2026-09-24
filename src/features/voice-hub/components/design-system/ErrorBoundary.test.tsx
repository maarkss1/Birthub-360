// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb(): never {
  throw new Error('Boom: something broke');
}

describe('ErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe child content')).toBeInTheDocument();
  });

  it('renders fallback UI instead of a blank/crashed page when a child throws', () => {
    // React logs the error to console.error during the render pass; silence it
    // so the test output stays clean without asserting on logger internals.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    // Fallback markup should be visible instead of the crashed child.
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.queryByText('Safe child content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recarregar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /painel/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders a custom fallback prop when provided instead of the default UI', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
