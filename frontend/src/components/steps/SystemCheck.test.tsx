import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { SetupStep } from './SetupStep';
import { WizardProvider } from '../wizard/WizardProvider';

const mockRequirements = {
  success: true,
  data: {
    all_passed: true,
    checks: [
      { name: 'Node.js', passed: true, required: '>=22.0.0', actual: '22.0.0', help_text: null },
      { name: 'npm', passed: true, required: '>=10.0.0', actual: '10.0.0', help_text: null },
      { name: 'Disk Space', passed: true, required: '500 MB', actual: '50 GB', help_text: null },
    ],
  },
  error: null,
};

const mockDetection = {
  success: true,
  data: {
    installed: false,
    version: null,
    install_path: null,
    config_found: false,
    existing_config: null,
  },
  error: null,
};

const server = setupServer(
  http.get('/api/system/requirements', () => HttpResponse.json(mockRequirements)),
  http.get('/api/system/detect-openclaw', () => HttpResponse.json(mockDetection)),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderSetupStep() {
  return render(
    <WizardProvider>
      <SetupStep />
    </WizardProvider>
  );
}

describe('SetupStep (formerly SystemCheck)', () => {
  test('renders setup step', () => {
    renderSetupStep();
    expect(screen.getByText('Setup')).toBeInTheDocument();
  });

  test('shows loading state initially', () => {
    renderSetupStep();
    expect(screen.getByText(/Running system checks/i)).toBeInTheDocument();
  });

  test('displays requirements after loading', async () => {
    renderSetupStep();
    await waitFor(() => {
      expect(screen.getByText('Node.js')).toBeInTheDocument();
    });
    expect(screen.getByText('npm')).toBeInTheDocument();
    expect(screen.getByText('Disk Space')).toBeInTheDocument();
  });

  test('shows all requirements met message', async () => {
    renderSetupStep();
    await waitFor(() => {
      expect(screen.getByText(/All requirements met/)).toBeInTheDocument();
    });
  });

  test('shows security acknowledgement section', async () => {
    renderSetupStep();
    await waitFor(() => {
      expect(screen.getByText('Security Notice')).toBeInTheDocument();
    });
  });

  test('shows error on API failure', async () => {
    server.use(
      http.get('/api/system/requirements', () =>
        HttpResponse.json(null, { status: 500 })
      ),
    );

    renderSetupStep();
    await waitFor(() => {
      expect(screen.getByText(/Error checking system/)).toBeInTheDocument();
    });
  });
});
