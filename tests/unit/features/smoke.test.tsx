import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/features/voice-hub/components/design-system/ThemeContext.js';

// Import pages to smoke test
import PrivacyPolicy from '@/pages/PrivacyPolicy.js';
import TermsOfUse from '@/pages/TermsOfUse.js';
import Landing from '@/features/voice-hub/pages/Landing.js';
import Login from '@/features/voice-hub/pages/Login.js';
import Register from '@/features/voice-hub/pages/Register.js';

describe('Smoke tests for previously ignored React components', () => {
  it('renders PrivacyPolicy without crashing', () => {
    const { container } = render(<PrivacyPolicy />);
    expect(container).toBeTruthy();
  });

  it('renders TermsOfUse without crashing', () => {
    const { container } = render(<TermsOfUse />);
    expect(container).toBeTruthy();
  });

  it('renders Landing without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <Landing />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders Login without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders Register without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
