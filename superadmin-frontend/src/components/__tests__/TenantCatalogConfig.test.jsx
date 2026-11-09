import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TenantCatalogConfig from '../TenantCatalogConfig';
import { getTenantCatalogConfig, updateTenantCatalogConfig, testTenantCatalogConnection } from '../../services/api';
import { toast } from 'sonner';

vi.mock('../../services/api', () => ({
  getTenantCatalogConfig: vi.fn(),
  updateTenantCatalogConfig: vi.fn(),
  testTenantCatalogConnection: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const PROVIDERS = ['none', 'sealmarket', 'generic_rest'];

const existingConfig = {
  tenantId: 't1',
  provider: 'generic_rest',
  isActive: true,
  baseUrl: 'https://api.acme.test',
  hasApiKey: true,
  connection: { auth: { type: 'bearer' } },
  searchSchema: { attributes: [{ key: 'familia', type: 'select', options: ['A'] }] },
  pricing: { taxRate: 0.08, pricesIncludeTax: true, currency: 'USD' },
  features: { customerLookup: false, csfExtraction: true, stockByLocation: true, productImages: false },
  aiRules: 'Regla 1',
};

describe('TenantCatalogConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty state when the tenant has no config', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: null, providers: PROVIDERS });

    render(<TenantCatalogConfig tenantId="t1" />);

    await waitFor(() => expect(screen.getByText('Sin configurar')).toBeInTheDocument());
    expect(getTenantCatalogConfig).toHaveBeenCalledWith('t1');
    expect(screen.getByLabelText('Proveedor')).toHaveValue('none');
    expect(screen.queryByRole('button', { name: /Probar conexión/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/URL base de la API/i)).not.toBeInTheDocument();
  });

  it('hydrates the form from an existing config without exposing the key', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: existingConfig, providers: PROVIDERS });

    render(<TenantCatalogConfig tenantId="t1" />);

    await waitFor(() => expect(screen.getByText('Activo')).toBeInTheDocument());
    expect(screen.getByText('Clave guardada')).toBeInTheDocument();
    expect(screen.getByLabelText('Proveedor')).toHaveValue('generic_rest');
    expect(screen.getByLabelText(/URL base de la API/i)).toHaveValue('https://api.acme.test');
    expect(screen.getByLabelText('API key')).toHaveValue('');
    expect(screen.getByText('Déjalo vacío para conservar la clave actual.')).toBeInTheDocument();
    expect(screen.getByLabelText('IVA (%)')).toHaveValue(8);
    expect(screen.getByLabelText('Moneda')).toHaveValue('USD');
    expect(screen.getByLabelText('Existencias por sucursal')).toBeChecked();
    expect(screen.getByLabelText('Consulta de clientes por RFC')).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Probar conexión/i })).toBeInTheDocument();
  });

  it('blocks saving when a JSON field is invalid', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: existingConfig, providers: PROVIDERS });
    render(<TenantCatalogConfig tenantId="t1" />);
    await waitFor(() => expect(screen.getByLabelText('searchSchema (JSON)')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('searchSchema (JSON)'), { target: { value: '{ not json' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar catálogo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Esquema de búsqueda \(searchSchema\): JSON inválido/);
    expect(updateTenantCatalogConfig).not.toHaveBeenCalled();
  });

  it('requires a base URL when a provider is selected', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: null, providers: PROVIDERS });
    render(<TenantCatalogConfig tenantId="t1" />);
    await waitFor(() => expect(screen.getByLabelText('Proveedor')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: 'sealmarket' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar catálogo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/URL base de la API/);
    expect(updateTenantCatalogConfig).not.toHaveBeenCalled();
  });

  it('saves a valid payload, omitting the API key when left blank', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: existingConfig, providers: PROVIDERS });
    updateTenantCatalogConfig.mockResolvedValueOnce({ ...existingConfig, aiRules: 'Regla 2' });
    render(<TenantCatalogConfig tenantId="t1" />);
    await waitFor(() => expect(screen.getByLabelText('Reglas')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Reglas'), { target: { value: 'Regla 2' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar catálogo/i }));

    await waitFor(() => expect(updateTenantCatalogConfig).toHaveBeenCalledTimes(1));
    const [tenantId, payload] = updateTenantCatalogConfig.mock.calls[0];
    expect(tenantId).toBe('t1');
    expect(payload).toMatchObject({
      provider: 'generic_rest',
      isActive: true,
      baseUrl: 'https://api.acme.test',
      connection: { auth: { type: 'bearer' } },
      pricing: { taxRate: 0.08, pricesIncludeTax: true, currency: 'USD' },
      aiRules: 'Regla 2',
    });
    expect(payload.apiKey).toBeUndefined();
    expect(toast.success).toHaveBeenCalled();
  });

  it('sends the new API key when typed', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: existingConfig, providers: PROVIDERS });
    updateTenantCatalogConfig.mockResolvedValueOnce(existingConfig);
    render(<TenantCatalogConfig tenantId="t1" />);
    await waitFor(() => expect(screen.getByLabelText('API key')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'new-secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar catálogo/i }));

    await waitFor(() => expect(updateTenantCatalogConfig).toHaveBeenCalled());
    expect(updateTenantCatalogConfig.mock.calls[0][1].apiKey).toBe('new-secret');
    await waitFor(() => expect(screen.getByLabelText('API key')).toHaveValue(''));
  });

  it('asks for confirmation before deactivating an active catalog', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: existingConfig, providers: PROVIDERS });
    updateTenantCatalogConfig.mockResolvedValueOnce({ ...existingConfig, isActive: false });
    render(<TenantCatalogConfig tenantId="t1" />);
    await waitFor(() => expect(screen.getByLabelText('Catálogo activo')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Catálogo activo'));
    fireEvent.click(screen.getByRole('button', { name: /Guardar catálogo/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(updateTenantCatalogConfig).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Sí, guardar cambios/i }));
    await waitFor(() => expect(updateTenantCatalogConfig).toHaveBeenCalled());
    expect(updateTenantCatalogConfig.mock.calls[0][1].isActive).toBe(false);
  });

  it('loads a template into the JSON fields and forces generic_rest', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: { ...existingConfig, connection: {}, searchSchema: null }, providers: PROVIDERS });
    render(<TenantCatalogConfig tenantId="t1" />);
    await waitFor(() => expect(screen.getByLabelText('Cargar plantilla')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Cargar plantilla'), { target: { value: 'llantas' } });

    expect(screen.getByLabelText('connection (JSON)').value).toContain('"x-api-key"');
    expect(screen.getByLabelText('searchSchema (JSON)').value).toContain('"key": "rin"');
    expect(toast.info).toHaveBeenCalled();
  });

  it('surfaces backend validation errors on save', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: existingConfig, providers: PROVIDERS });
    updateTenantCatalogConfig.mockRejectedValueOnce(new Error('attributes[0] (select) requiere options u optionsSource'));
    render(<TenantCatalogConfig tenantId="t1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Guardar catálogo/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Guardar catálogo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/requiere options u optionsSource/);
    expect(toast.error).toHaveBeenCalled();
  });

  it('reports the result of the connection test', async () => {
    getTenantCatalogConfig.mockResolvedValueOnce({ data: existingConfig, providers: PROVIDERS });
    testTenantCatalogConnection.mockResolvedValueOnce({ ok: false, message: 'timeout' });
    render(<TenantCatalogConfig tenantId="t1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Probar conexión/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Probar conexión/i }));

    await waitFor(() => expect(testTenantCatalogConnection).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('timeout'));
  });

  it('shows a retryable alert when loading fails', async () => {
    getTenantCatalogConfig.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ data: null, providers: PROVIDERS });
    render(<TenantCatalogConfig tenantId="t1" />);

    expect(await screen.findByTestId('dashboard-error')).toHaveTextContent('boom');
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => expect(screen.getByText('Sin configurar')).toBeInTheDocument());
  });
});
