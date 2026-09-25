import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/features/voice-hub/components/design-system/ThemeContext.js';

// Import pages to smoke test
import Admin from '@/features/voice-hub/pages/Dashboard/Admin.js';
import AgentRegistry from '@/features/voice-hub/pages/Dashboard/AgentRegistry.js';
import KnowledgeManager from '@/features/voice-hub/pages/Dashboard/KnowledgeManager.js';
import Organization from '@/features/voice-hub/pages/Dashboard/Organization.js';
import Overview from '@/features/voice-hub/pages/Dashboard/Overview.js';
import Playground from '@/features/voice-hub/pages/Dashboard/Playground.js';
import Preferences from '@/features/voice-hub/pages/Dashboard/Preferences.js';
import Supervision from '@/features/voice-hub/pages/Dashboard/Supervision.js';
import Telephony from '@/features/voice-hub/pages/Dashboard/Telephony.js';

describe('Smoke tests for Dashboard pages', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          {ui}
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  it('renders Admin without crashing', () => {
    const { container } = renderWithProviders(<Admin />);
    expect(container).toBeTruthy();
  });

  it('renders AgentRegistry without crashing', () => {
    const { container } = renderWithProviders(<AgentRegistry />);
    expect(container).toBeTruthy();
  });

  it('renders KnowledgeManager without crashing', () => {
    const { container } = renderWithProviders(<KnowledgeManager />);
    expect(container).toBeTruthy();
  });

  it('renders Organization without crashing', () => {
    const { container } = renderWithProviders(<Organization />);
    expect(container).toBeTruthy();
  });

  it('renders Overview without crashing', () => {
    const { container } = renderWithProviders(<Overview />);
    expect(container).toBeTruthy();
  });

  it('renders Playground without crashing', () => {
    const { container } = renderWithProviders(<Playground />);
    expect(container).toBeTruthy();
  });

  it('renders Preferences without crashing', () => {
    const { container } = renderWithProviders(<Preferences />);
    expect(container).toBeTruthy();
  });

  it('renders Supervision without crashing', () => {
    const { container } = renderWithProviders(<Supervision />);
    expect(container).toBeTruthy();
  });

  it('renders Telephony without crashing', () => {
    const { container } = renderWithProviders(<Telephony />);
    expect(container).toBeTruthy();
  });
});
