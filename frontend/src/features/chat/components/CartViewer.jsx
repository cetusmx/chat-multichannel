import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Trash, Search, Database, Send, MessageSquare, X, FileText, Mail, Pencil } from 'lucide-react';
import { post, updateClientCart, searchSealMarketCatalog, getSealMarketFamilias, getClientByRfc, enviarCotizacionEmail, buildQuotePayload } from '../../../services/api';
import useChatStore from '../../../stores/useChatStore';
import { toast } from '../../../stores/useToastStore.js';
import ConfirmModal from '../../../components/ConfirmModal.jsx';
import { Button, IconButton, Eyebrow, Tabs, Badge, Field, Input, Textarea, Select, Spinner, EmptyState, Modal } from '../../../components/ui/index.js';
import { formatMoney } from '../../../utils/formatDate.js';
import { cn } from '../../../utils/cn.js';

export default function CartViewer({ cartData, client, onClose }) {
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'catalog'
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, idx: null });
  const { sendMessage } = useChatStore();

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState('');

  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [tempBilling, setTempBilling] = useState({ razonSocial: '', rfc: '', billingAddress: '' });
  const [isSearchingRfc, setIsSearchingRfc] = useState(false);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Catalog state
  const [familias, setFamilias] = useState([]);
  const [searchForm, setSearchForm] = useState({
    familia: '',
    sist_med: 'std',
    diam_int: '',
    diam_ext: '',
    altura: '',
    seccion: '',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    if (activeTab === 'catalog' && familias.length === 0) {
      getSealMarketFamilias()
        .then(data => setFamilias(data))
        .catch(err => console.error('Error al cargar familias:', err));
    }
  }, [activeTab, familias.length]);

  let cartItems = [];
  let shippingAddress = null;
  let razonSocial = null;
  let rfc = null;
  let billingAddress = null;

  if (Array.isArray(cartData)) {
    cartItems = cartData;
  } else if (cartData && cartData.items) {
    cartItems = cartData.items;
    shippingAddress = cartData.shippingAddress;
    razonSocial = cartData.razonSocial;
    rfc = cartData.rfc || cartData.RFC;
    billingAddress = cartData.billingAddress || cartData.domicilioFiscal;
  }

  const isEmpty = !cartItems || cartItems.length === 0;

  // Prices are stored net (IVA included), so the subtotal is derived from the total.
  const total = cartItems.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 1)), 0);
  const subtotal = total / 1.16;
  const iva = total - subtotal;

  // Define update helper
  const saveCart = async (newItems) => {
    if (!client?.id) return;
    setIsUpdating(true);
    try {
      const newCartData = {
        items: newItems,
        shippingAddress,
        razonSocial,
        rfc,
        billingAddress,
      };
      await updateClientCart(client.id, newCartData);
    } catch (err) {
      console.error('Failed to update cart', err);
      toast.error('No se pudo actualizar el carrito', { description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAddress = async (validate = false) => {
    if (!client?.id) return;
    setIsUpdating(true);
    try {
      const newCartData = {
        items: cartItems,
        shippingAddress: tempAddress,
        razonSocial,
        rfc,
        billingAddress,
      };
      await updateClientCart(client.id, newCartData);
      setIsEditingAddress(false);

      if (validate && tempAddress) {
        sendMessage(`Por favor valida tu dirección de envío:\n\n*${tempAddress}*\n\n¿Es correcta?`, false);
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudo actualizar la dirección', { description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveBilling = async (validate = false) => {
    if (!client?.id) return;
    setIsUpdating(true);
    try {
      const newCartData = {
        items: cartItems,
        shippingAddress,
        razonSocial: tempBilling.razonSocial,
        rfc: tempBilling.rfc,
        billingAddress: tempBilling.billingAddress,
      };
      await updateClientCart(client.id, newCartData);
      setIsEditingBilling(false);

      if (validate) {
        sendMessage(`Por favor valida tus datos de facturación:\n\nRazón Social: *${tempBilling.razonSocial || '-'}*\nRFC: *${tempBilling.rfc || '-'}*\nDomicilio: *${tempBilling.billingAddress || '-'}*\n\n¿Son correctos?`, false);
      }
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron actualizar los datos fiscales', { description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSearchRfc = async () => {
    if (!tempBilling.rfc) return;
    setIsSearchingRfc(true);
    try {
      const response = await getClientByRfc(tempBilling.rfc);
      const cliente = Array.isArray(response.data) ? response.data[0] : response.data;
      if (cliente) {
        const calle = cliente.CALLE || '';
        const num = cliente.NUMEXT || '';
        const col = cliente.COLONIA ? `Col. ${cliente.COLONIA}` : '';
        const cp = cliente.CODIGO ? `C.P. ${cliente.CODIGO}` : '';
        const mun = cliente.MUNICIPIO || '';
        const est = cliente.ESTADO || '';
        const direccion = `${calle} ${num}, ${col}, ${cp}, ${mun}, ${est}`.trim().replace(/,\s*,/g, ',');

        setTempBilling(prev => ({
          ...prev,
          razonSocial: cliente.NOMBRE || prev.razonSocial,
          billingAddress: direccion || prev.billingAddress,
          rfc: cliente.RFC || prev.rfc,
        }));
      } else {
        toast.warning('RFC no encontrado', { description: 'El RFC no fue encontrado en la base de datos.' });
      }
    } catch (err) {
      toast.error('No se pudo consultar el RFC', { description: err.message });
    } finally {
      setIsSearchingRfc(false);
    }
  };

  const handleUpdateQuantity = (idx, delta) => {
    const newItems = [...cartItems];
    const item = newItems[idx];
    const newQty = (item.cantidad || 1) + delta;
    if (newQty < 1) return;
    item.cantidad = newQty;
    saveCart(newItems);
  };

  const handleRemoveItem = (idx) => {
    setConfirmModal({ open: true, type: 'REMOVE', idx });
  };

  const handleClearCart = () => {
    setConfirmModal({ open: true, type: 'CLEAR', idx: null });
  };

  const executeConfirm = () => {
    if (confirmModal.type === 'REMOVE') {
      const newItems = cartItems.filter((_, i) => i !== confirmModal.idx);
      saveCart(newItems);
    } else if (confirmModal.type === 'CLEAR') {
      saveCart([]);
    }
    setConfirmModal({ open: false, type: null, idx: null });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchForm.familia) {
      setSearchError('Por favor selecciona una familia principal.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await searchSealMarketCatalog(searchForm);
      setSearchResults(res.data || []);
    } catch (err) {
      setSearchError(err.message || 'Error buscando en el catálogo');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInjectProduct = (product) => {
    const newItems = [...cartItems];
    const desc = product.DESC_ECOMM || product.DESCR || product.NOMBRE;
    // Check if already in cart
    const existingIdx = newItems.findIndex(i => i.clave === product.CVE_ART);
    if (existingIdx >= 0) {
      newItems[existingIdx].cantidad = (newItems[existingIdx].cantidad || 1) + 1;
    } else {
      newItems.push({
        clave: product.CVE_ART,
        descripcion: desc,
        precio: (product.PRECIO || 0) * 1.16, // Guardamos el precio Neto
        cantidad: 1,
      });
    }
    saveCart(newItems);

    // Send auto-confirmation message to chat
    const priceNet = ((product.PRECIO || 0) * 1.16).toFixed(2);
    sendMessage(`✅ *Agregado al carrito:*\n1x ${product.CVE_ART} - ${desc}\nPrecio: $${priceNet} Neto (IVA Incluido)`, false);

    // Optional: Auto-switch back to cart to show the added item
    setActiveTab('current');
  };

  const handleSuggestProduct = (product) => {
    const desc = product.DESC_ECOMM || product.DESCR || product.NOMBRE;
    const priceNet = ((product.PRECIO || 0) * 1.16).toFixed(2);
    const linea = product.LIN_PROD || '';
    const imageUrl = `https://sistemahidraulico.mx/Perfiles/${linea}.jpg`;

    const metadata = {
      clave: product.CVE_ART,
      description: desc,
      priceNet: priceNet,
      imageUrl: imageUrl,
      rawProduct: product,
    };

    useChatStore.getState().sendMessage('', false, 'PRODUCT_CARD', metadata);
  };

  const handleSendSummary = () => {
    if (cartItems.length === 0) return;

    let text = '🛒 *RESUMEN DE COTIZACIÓN*\n';
    cartItems.forEach(item => {
      text += `▫️ ${item.cantidad}x ${item.clave}\n`;
    });
    text += `\n*Total Neto:* ${total.toFixed(2)}`;

    const metadata = {
      items: cartItems.map(item => ({
        clave: item.clave,
        descripcion: item.descripcion,
        precio: item.precio || 0,
        cantidad: item.cantidad || 1,
      })),
      subtotal,
      iva,
      total,
      shippingAddress,
    };

    sendMessage(text, false, 'CART_SUMMARY', metadata);
  };

  // Same payload as before: `conversationId` makes the backend also send the PDF to the client via WhatsApp.
  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await post('/chat/quote/generate', {
        conversationId: useChatStore.getState().currentConversationId,
        ...buildQuotePayload(client, cartData),
      });
      if (!res.ok) throw new Error('Falló al generar PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Cotizacion_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Cotización generada');
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudo generar la cotización PDF', { description: error.message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const closeEmailModal = () => {
    if (isSendingEmail) return;
    setEmailModalOpen(false);
    setEmailTo('');
  };

  const handleSendEmail = async (e) => {
    e?.preventDefault();
    const email = emailTo.trim();
    if (!email) return;
    setIsSendingEmail(true);
    try {
      const res = await enviarCotizacionEmail({ email, ...buildQuotePayload(client, cartData) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al enviar');
      }
      toast.success('Cotización enviada por correo', { description: email });
      setEmailModalOpen(false);
      setEmailTo('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudo enviar la cotización por correo', { description: error.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const stepperButton = 'flex h-8 w-8 items-center justify-center text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-muted';

  return (
    <div className={cn('flex h-full flex-col bg-surface', isUpdating && 'pointer-events-none opacity-70')} aria-busy={isUpdating || undefined}>

      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <Eyebrow tone="muted" className="mb-1 block">Carrito</Eyebrow>
            <h2 className="truncate text-base font-semibold text-fg">{client?.name || 'Cliente'}</h2>
            {client?.phone && <div className="mt-0.5 font-mono text-[11px] text-fg-subtle">{client.phone}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton icon={Trash} label="Vaciar carrito" variant="danger" onClick={handleClearCart} disabled={isEmpty} />
            <IconButton icon={X} label="Cerrar" onClick={onClose} />
          </div>
        </div>
        <Tabs
          className="px-2"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { id: 'current', label: 'Pedido', count: cartItems.length },
            { id: 'catalog', label: 'Catálogo' },
          ]}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'current' ? (
          <>
            {isEmpty ? (
              <EmptyState
                compact
                icon={ShoppingCart}
                title="El carrito está vacío"
                description="Agrega productos desde el catálogo para armar el pedido."
                action={<Button variant="chip" size="xs" icon={Search} onClick={() => setActiveTab('catalog')}>Buscar productos</Button>}
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {cartItems.map((item, idx) => (
                  <li key={idx} className="flex flex-col gap-2.5 px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[11px] text-fg-subtle">{item.clave}</div>
                        <div className="mt-0.5 line-clamp-2 text-sm text-fg" title={item.descripcion}>{item.descripcion}</div>
                      </div>
                      <IconButton icon={Trash2} label="Eliminar artículo" variant="danger" size="sm" onClick={() => handleRemoveItem(idx)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
                        <button type="button" onClick={() => handleUpdateQuantity(idx, -1)} disabled={item.cantidad <= 1} className={stepperButton} aria-label="Menos">
                          <Minus size={12} aria-hidden />
                        </button>
                        <span className="tnum w-7 text-center font-mono text-xs text-fg">{item.cantidad}</span>
                        <button type="button" onClick={() => handleUpdateQuantity(idx, 1)} className={stepperButton} aria-label="Más">
                          <Plus size={12} aria-hidden />
                        </button>
                      </div>
                      <span className="tnum font-mono text-sm font-semibold text-fg">{formatMoney(item.precio * item.cantidad)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Shipping address */}
            <section className="border-t border-border px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Eyebrow tone="muted">Dirección de envío</Eyebrow>
                {!isEditingAddress && (
                  <Button variant="ghost" size="xs" icon={Pencil} onClick={() => { setTempAddress(shippingAddress || ''); setIsEditingAddress(true); }}>
                    Editar
                  </Button>
                )}
              </div>

              {isEditingAddress ? (
                <div className="space-y-3">
                  <Field label="Dirección">
                    {(p) => (
                      <Textarea
                        {...p}
                        value={tempAddress}
                        onChange={(e) => setTempAddress(e.target.value)}
                        placeholder="Calle, número, colonia, código postal, ciudad, estado"
                        className="min-h-[72px]"
                      />
                    )}
                  </Field>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingAddress(false)}>Cancelar</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleSaveAddress(false)}>Guardar</Button>
                    <Button variant="outline" size="sm" icon={Send} onClick={() => handleSaveAddress(true)} disabled={!tempAddress}>
                      Guardar y validar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className={cn('text-sm leading-relaxed', shippingAddress ? 'text-fg' : 'text-fg-subtle')}>
                    {shippingAddress || 'Sin dirección registrada'}
                  </p>
                  {shippingAddress && (
                    <Button
                      variant="chip"
                      size="xs"
                      icon={Send}
                      className="shrink-0"
                      onClick={() => sendMessage(`Por favor valida tu dirección de envío:\n\n*${shippingAddress}*\n\n¿Es correcta?`, false)}
                      title="Pedir validación en el chat"
                    >
                      Validar
                    </Button>
                  )}
                </div>
              )}
            </section>

            {/* Billing data */}
            <section className="border-t border-border px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Eyebrow tone="muted">Datos fiscales</Eyebrow>
                {!isEditingBilling && (
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={Pencil}
                    onClick={() => {
                      setTempBilling({ razonSocial: razonSocial || '', rfc: rfc || '', billingAddress: billingAddress || '' });
                      setIsEditingBilling(true);
                    }}
                  >
                    Editar
                  </Button>
                )}
              </div>

              {isEditingBilling ? (
                <div className="space-y-3">
                  <Field label="RFC">
                    {(p) => (
                      <div className="flex gap-2">
                        <Input
                          {...p}
                          mono
                          value={tempBilling.rfc}
                          onChange={(e) => setTempBilling({ ...tempBilling, rfc: e.target.value })}
                          placeholder="XAXX010101000"
                          className="uppercase"
                        />
                        <Button
                          variant="secondary"
                          size="md"
                          icon={Search}
                          className="shrink-0"
                          onClick={handleSearchRfc}
                          disabled={!tempBilling.rfc}
                          loading={isSearchingRfc}
                          title="Buscar datos fiscales del cliente por RFC"
                        >
                          Buscar
                        </Button>
                      </div>
                    )}
                  </Field>
                  <Field label="Razón social">
                    {(p) => (
                      <Input
                        {...p}
                        value={tempBilling.razonSocial}
                        onChange={(e) => setTempBilling({ ...tempBilling, razonSocial: e.target.value })}
                        placeholder="Nombre o razón social"
                      />
                    )}
                  </Field>
                  <Field label="Domicilio fiscal">
                    {(p) => (
                      <Textarea
                        {...p}
                        value={tempBilling.billingAddress}
                        onChange={(e) => setTempBilling({ ...tempBilling, billingAddress: e.target.value })}
                        placeholder="Calle, número, colonia, código postal, ciudad, estado"
                        className="min-h-[72px]"
                      />
                    )}
                  </Field>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingBilling(false)}>Cancelar</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleSaveBilling(false)}>Guardar</Button>
                    <Button variant="outline" size="sm" icon={Send} onClick={() => handleSaveBilling(true)} disabled={!tempBilling.razonSocial && !tempBilling.rfc}>
                      Guardar y validar
                    </Button>
                  </div>
                </div>
              ) : razonSocial || rfc || billingAddress ? (
                <dl className="space-y-1.5 text-sm">
                  {razonSocial && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-fg-muted">Razón social</dt>
                      <dd className="min-w-0 text-fg">{razonSocial}</dd>
                    </div>
                  )}
                  {rfc && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-fg-muted">RFC</dt>
                      <dd className="min-w-0 font-mono text-[13px] text-fg">{rfc}</dd>
                    </div>
                  )}
                  {billingAddress && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-fg-muted">Domicilio</dt>
                      <dd className="min-w-0 leading-relaxed text-fg">{billingAddress}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-fg-subtle">Sin datos fiscales registrados</p>
              )}
            </section>
          </>
        ) : (
          <>
            {/* Parametric search */}
            <form onSubmit={handleSearch} className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4">
              <Field label="Familia" required className="col-span-2">
                {(p) => (
                  <Select {...p} value={searchForm.familia} onChange={(e) => setSearchForm({ ...searchForm, familia: e.target.value })}>
                    <option value="">Seleccionar familia</option>
                    {familias.map((f, i) => (
                      <option key={i} value={f.FAMILIA}>{f.FAMILIA}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Sistema de medida">
                {(p) => (
                  <Select {...p} value={searchForm.sist_med} onChange={(e) => setSearchForm({ ...searchForm, sist_med: e.target.value })}>
                    <option value="std">Pulgadas (STD)</option>
                    <option value="mm">Milímetros (mm)</option>
                  </Select>
                )}
              </Field>
              <Field label="Diámetro interior">
                {(p) => <Input {...p} mono value={searchForm.diam_int} onChange={(e) => setSearchForm({ ...searchForm, diam_int: e.target.value })} placeholder="1.25" />}
              </Field>
              <Field label="Diámetro exterior">
                {(p) => <Input {...p} mono value={searchForm.diam_ext} onChange={(e) => setSearchForm({ ...searchForm, diam_ext: e.target.value })} placeholder="2.5" />}
              </Field>
              <Field label="Altura">
                {(p) => <Input {...p} mono value={searchForm.altura} onChange={(e) => setSearchForm({ ...searchForm, altura: e.target.value })} placeholder="0.25" />}
              </Field>
              <Field label="Sección">
                {(p) => <Input {...p} mono value={searchForm.seccion} onChange={(e) => setSearchForm({ ...searchForm, seccion: e.target.value })} placeholder="139" />}
              </Field>
              <div className="col-span-2 flex flex-col gap-2">
                <Button type="submit" variant="primary" icon={Search} loading={isSearching} disabled={!searchForm.familia} className="w-full">
                  Buscar
                </Button>
                {searchError && <p className="text-xs text-danger" role="alert">{searchError}</p>}
              </div>
            </form>

            {/* Results */}
            {isSearching ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : searchResults.length === 0 ? (
              <EmptyState
                compact
                icon={Database}
                title="Sin resultados"
                description={searchForm.familia ? 'Ajusta las medidas o la familia y vuelve a buscar.' : 'Selecciona una familia y aplica filtros para ver productos.'}
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {searchResults.map((product, idx) => {
                  const totalExt = Object.values(product.existencias || {}).reduce((a, b) => a + (b || 0), 0);
                  const desc = product.DESC_ECOMM || product.DESCR || product.NOMBRE;
                  return (
                    <li key={idx} className="flex flex-col gap-2.5 px-5 py-3 hover:bg-surface-2/60">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] text-fg-subtle">{product.CVE_ART}</div>
                          <div className="mt-0.5 line-clamp-2 text-sm text-fg" title={desc}>{desc}</div>
                        </div>
                        <Badge tone={totalExt > 0 ? 'success' : 'neutral'} className="shrink-0">
                          {totalExt > 0 ? `${totalExt} en existencia` : 'Sin existencia'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="tnum text-sm">
                          <span className="font-mono font-semibold text-fg">{formatMoney((product.PRECIO || 0) * 1.16)}</span>
                          <span className="ml-1.5 text-xs text-fg-subtle">IVA incluido</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            type="button"
                            variant="chip"
                            size="xs"
                            icon={MessageSquare}
                            title="Sugerir en el chat"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSuggestProduct(product);
                            }}
                          >
                            Sugerir al cliente
                          </Button>
                          <Button
                            type="button"
                            variant="chip-accent"
                            size="xs"
                            icon={Plus}
                            onClick={(e) => {
                              e.preventDefault();
                              handleInjectProduct(product);
                            }}
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {activeTab === 'current' && (
        <div className="shrink-0 border-t border-border px-5 py-4">
          <div className="space-y-1 text-[13px]">
            <div className="flex justify-between text-fg-muted">
              <span>Subtotal</span>
              <span className="tnum font-mono">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-fg-muted">
              <span>IVA (16%)</span>
              <span className="tnum font-mono">{formatMoney(iva)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-fg">
              <span>Total</span>
              <span className="tnum font-mono">{formatMoney(total)}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="primary" icon={FileText} className="w-full" loading={isGeneratingPdf} disabled={isEmpty} onClick={handleGeneratePdf}>
              Generar cotización PDF
            </Button>
            <Button variant="secondary" icon={Mail} className="w-full" disabled={isEmpty} onClick={() => setEmailModalOpen(true)}>
              Enviar por correo
            </Button>
            <Button variant="outline" icon={Send} className="w-full" disabled={isEmpty} onClick={handleSendSummary}>
              Enviar resumen al chat
            </Button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.type === 'CLEAR' ? 'Vaciar carrito' : 'Eliminar artículo'}
        message={confirmModal.type === 'CLEAR' ? '¿Estás seguro de vaciar todo el carrito?' : '¿Seguro que deseas eliminar este artículo del carrito?'}
        confirmText={confirmModal.type === 'CLEAR' ? 'Vaciar' : 'Eliminar'}
        onConfirm={executeConfirm}
        onCancel={() => setConfirmModal({ open: false, type: null, idx: null })}
      />

      <Modal
        open={emailModalOpen}
        onClose={closeEmailModal}
        size="sm"
        eyebrow="Cotización"
        title="Enviar por correo"
        description="Se enviará el PDF de la cotización con las partidas actuales del pedido."
        footer={
          <>
            <Button variant="ghost" onClick={closeEmailModal} disabled={isSendingEmail}>Cancelar</Button>
            <Button variant="primary" type="submit" form="cart-email-form" icon={Mail} loading={isSendingEmail} disabled={!emailTo.trim()}>
              Enviar
            </Button>
          </>
        }
      >
        <form id="cart-email-form" onSubmit={handleSendEmail}>
          <Field label="Correo del cliente">
            {(p) => (
              <Input
                {...p}
                type="email"
                required
                autoComplete="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="cliente@empresa.com"
                disabled={isSendingEmail}
                data-autofocus
              />
            )}
          </Field>
        </form>
      </Modal>
    </div>
  );
}
