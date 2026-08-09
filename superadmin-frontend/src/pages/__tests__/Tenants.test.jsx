import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Tenants from '../Tenants';
import { api } from '../../services/api';

// Mock the API and toast
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock the CreateTenantModal since we only want to test the main page
vi.mock('../../components/CreateTenantModal', () => ({
  default: () => <div data-testid="create-tenant-modal-mock"></div>
}));

describe('Tenants Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub window.confirm to always return true for toggle test
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('renders correctly and fetches tenants', async () => {
    api.get.mockResolvedValueOnce({
      data: [
        { id: '1', name: 'Acme Corp', domain: 'acme', status: 'active', createdAt: new Date().toISOString() }
      ],
      meta: { total: 1, page: 1, limit: 10 }
    });

    render(<BrowserRouter><Tenants /></BrowserRouter>);

    // Shows loading state initially
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

    // Wait for fetch
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    expect(screen.getByText('acme')).toBeInTheDocument();
  });

  it('toggles tenant status correctly and updates aria-pressed', async () => {
    api.get.mockResolvedValueOnce({
      data: [
        { id: '1', name: 'Acme Corp', domain: 'acme', status: 'active', createdAt: new Date().toISOString() }
      ],
      meta: { total: 1, page: 1, limit: 10 }
    });
    
    api.patch.mockResolvedValueOnce({ success: true });

    render(<BrowserRouter><Tenants /></BrowserRouter>);

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', { name: /Suspender inquilino Acme Corp/i });
    expect(toggleBtn).toBeInTheDocument();
    
    // For active tenant, aria-pressed should be false
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    // Click to suspend
    fireEvent.click(toggleBtn);
    
    // Should immediately show loading state
    expect(toggleBtn).toHaveTextContent('Procesando...');
    expect(toggleBtn).toBeDisabled();

    // Should call API
    expect(api.patch).toHaveBeenCalledWith('/api/superadmin/tenants/1/status', { status: 'suspended' });

    // Wait for optimistic update or re-render
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reactivar inquilino Acme Corp/i })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('reverts optimistic update on failure', async () => {
    api.get.mockResolvedValueOnce({
      data: [
        { id: '1', name: 'Acme Corp', domain: 'acme', status: 'active', createdAt: new Date().toISOString() }
      ],
      meta: { total: 1, page: 1, limit: 10 }
    });
    
    api.patch.mockRejectedValueOnce(new Error('Network error'));

    render(<BrowserRouter><Tenants /></BrowserRouter>);

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', { name: /Suspender inquilino Acme Corp/i });

    // Click to suspend
    fireEvent.click(toggleBtn);

    // Expect error toast and reverted state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Suspender inquilino Acme Corp/i })).toBeInTheDocument();
    });
  });
});
