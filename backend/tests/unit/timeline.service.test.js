const { describeCartChanges } = require('../../src/services/timeline.service');

describe('timeline.service.describeCartChanges', () => {
  const kit = { clave: 'PK-0500', descripcion: 'Kit empaques pistón 50', cantidad: 1, precio: 612 };
  const sello = { clave: 'PS-PTB05006060P', descripcion: 'Sello vástago 50×60×6', cantidad: 2, precio: 229 };

  it('detects added items', () => {
    const events = describeCartChanges([sello], [sello, kit], 'El cliente');
    expect(events).toHaveLength(1);
    expect(events[0].content).toBe('El cliente agregó *Kit empaques pistón 50* a su pedido');
    expect(events[0].tone).toBe('success');
  });

  it('detects quantity changes', () => {
    const events = describeCartChanges([sello], [{ ...sello, cantidad: 5 }], 'Luis');
    expect(events).toHaveLength(1);
    expect(events[0].content).toBe('Luis cambió *Sello vástago 50×60×6* de 2 a 5 piezas');
  });

  it('detects removed items', () => {
    const events = describeCartChanges([sello, kit], [sello]);
    expect(events).toHaveLength(1);
    expect(events[0].content).toContain('quitó *Kit empaques pistón 50*');
    expect(events[0].tone).toBe('warning');
  });

  it('handles object and string cart shapes', () => {
    const before = JSON.stringify({ items: [sello], shippingAddress: 'Saltillo' });
    const after = { items: [sello, kit], shippingAddress: 'Saltillo' };
    expect(describeCartChanges(before, after)).toHaveLength(1);
  });

  it('returns nothing when the cart is unchanged', () => {
    expect(describeCartChanges([sello, kit], [kit, sello])).toHaveLength(0);
    expect(describeCartChanges(null, [])).toHaveLength(0);
  });

  it('falls back to the clave when there is no description', () => {
    const events = describeCartChanges([], [{ clave: 'OR-050', cantidad: 1 }]);
    expect(events[0].content).toBe('El cliente agregó *OR-050* a su pedido');
  });
});
