/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  it('renders the sidebar with correct fixed width and labels', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    
    // Debería tener el texto del branding y de los links (UX-DR2)
    expect(screen.getByText('SalesFlow')).toBeDefined();
    expect(screen.getByText('Conversaciones')).toBeDefined();
    expect(screen.getByText('Métricas')).toBeDefined();
    
    // Verificar que Sidebar tiene la clase w-64 para asegurar que es non-collapsible y fijo
    const aside = screen.getByRole('complementary'); // <aside> role
    expect(aside.className).toContain('w-64');
  });
});
