import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';
import api from '@/lib/axios';

import axios from 'axios';

const jest = vi;

vi.mock('@/lib/axios', () => {
  return {
    default: {
      get: vi.fn(),
    }
  };
});

// Mock axios.isCancel
vi.spyOn(axios, 'isCancel').mockImplementation((err) => err?.name === 'CanceledError');

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders loading state initially', async () => {
    api.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<Dashboard />);
    
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('renders correctly with metrics data', async () => {
    api.get.mockResolvedValue({ 
      data: { data: { tenants: 10, users: 100, aiTokens: 5000 } } 
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    const widgets = screen.getAllByTestId(/metric-widget/);
    expect(widgets.length).toBeGreaterThan(0);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();
  });

  it('renders correctly with zero/empty state', async () => {
    api.get.mockResolvedValue({ 
      data: { data: { tenants: 0, users: 0, aiTokens: 0 } } 
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    const widgets = screen.getAllByTestId(/metric-widget/);
    expect(widgets.length).toBeGreaterThan(0);

    // Check for zeros
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThanOrEqual(3);
  });

  it('renders error state on API failure and allows retry', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));
    
    // For the retry
    api.get.mockResolvedValueOnce({ 
      data: { data: { tenants: 10, users: 100, aiTokens: 5000 } } 
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-error')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
