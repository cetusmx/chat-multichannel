import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateTenantModal from '../CreateTenantModal';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: { post: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Empresa/), { target: { value: 'Acme Corp' } });
  fireEvent.change(screen.getByLabelText(/Dominio/), { target: { value: 'acme' } });
  fireEvent.change(screen.getByLabelText(/Nombre del Admin/), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText(/Apellido del Admin/), { target: { value: 'Lopez' } });
  fireEvent.change(screen.getByLabelText(/Email Admin/), { target: { value: 'ana@acme.com' } });
  fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: 'Password123!' } });
}

describe('CreateTenantModal catalog section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { tenant: { id: 't1' } } });
  });

  it('submits without catalogConfig when the section is untouched', async () => {
    render(<CreateTenantModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Crear Inquilino/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/api/superadmin/tenants');
    expect(body.catalogConfig).toBeUndefined();
    expect(body.slug).toBe('acme');
  });

  it('requires a base URL when a provider is chosen', async () => {
    render(<CreateTenantModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Catálogo de productos/i }));
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: 'generic_rest' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear Inquilino/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/URL base de la API es obligatoria/);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sends catalogConfig with the selected template', async () => {
    render(<CreateTenantModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Catálogo de productos/i }));
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: 'generic_rest' } });
    fireEvent.change(screen.getByLabelText('Plantilla'), { target: { value: 'ferreteria' } });
    fireEvent.change(screen.getByLabelText(/URL base de la API/), { target: { value: 'https://api.acme.test' } });
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'tok' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear Inquilino/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const body = api.post.mock.calls[0][1];
    expect(body.catalogConfig).toMatchObject({
      provider: 'generic_rest',
      isActive: true,
      baseUrl: 'https://api.acme.test',
      apiKey: 'tok',
    });
    expect(body.catalogConfig.searchSchema.attributes[0].key).toBe('familia');
    expect(body.catalogConfig.connection.search.path).toBe('/api/products');
  });

  it('shows catalog-level backend errors inside the section', async () => {
    const err = new Error('Proveedor de catálogo desconocido: x');
    err.status = 400;
    err.data = { error: { message: 'Proveedor de catálogo desconocido: x' } };
    api.post.mockRejectedValueOnce(err);

    render(<CreateTenantModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /Catálogo de productos/i }));
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: 'sealmarket' } });
    fireEvent.change(screen.getByLabelText(/URL base de la API/), { target: { value: 'https://erp.test' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear Inquilino/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Proveedor de catálogo desconocido/);
  });
});
