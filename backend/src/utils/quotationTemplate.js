const fs = require('fs');
const path = require('path');

function getBase64Logo() {
  try {
    const logoPath = path.join(__dirname, '../assets/Logo3tr.png');
    const logoData = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoData.toString('base64')}`;
  } catch (error) {
    console.error('Error loading logo:', error);
    return ''; // Fallback si no se encuentra
  }
}

function generateQuotationHtml(data) {
  const {
    company = {
      name: 'Seal Market',
      address: 'Calle Ejemplo 123, Ciudad, País',
      rfc: 'XAXX010101000',
      email: 'ventas@sealmarket.com',
      phone: '555-123-4567'
    },
    client = {
      name: 'Cliente Final',
      rfc: '',
      address: '',
      phone: ''
    },
    cartItems = [],
    bankDetails = {
      bank: 'BBVA',
      account: '0123456789',
      clabe: '012345678901234567'
    }
  } = data;

  const logoBase64 = getBase64Logo();
  
  // Format dates
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const folio = `COT-${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*1000)}`;

  // Calculate totals
  const total = cartItems.reduce((acc, item) => acc + (item.precioNeto * item.quantity), 0);

  let itemsHtml = '';
  cartItems.forEach((item, index) => {
    const totalItem = (item.precioNeto * item.quantity).toFixed(2);
    itemsHtml += `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${item.cve_art}</td>
        <td>${item.desc}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">$${item.precioNeto.toFixed(2)}</td>
        <td class="right fw-bold">$${totalItem}</td>
      </tr>
    `;
  });

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Cotización ${folio}</title>
    <style>
      :root {
        --primary: #002B59;
        --accent: #FF0010;
        --bg-color: #FFFFFF;
        --text-dark: #333333;
        --text-light: #666666;
        --border-color: #E2E8F0;
      }
      
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 40px 50px;
        font-family: 'Inter', sans-serif;
        background-color: var(--bg-color);
        color: var(--text-dark);
        font-size: 13px;
        line-height: 1.5;
      }

      /* --- HEADER --- */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 40px;
        border-bottom: 2px solid var(--primary);
        padding-bottom: 20px;
      }

      .logo-container img {
        max-width: 180px;
        height: auto;
      }

      .company-details {
        margin-top: 10px;
        color: var(--text-light);
        font-size: 11px;
      }

      .quote-info {
        text-align: right;
      }

      .quote-title {
        font-size: 28px;
        font-weight: 700;
        color: var(--primary);
        margin: 0 0 5px 0;
        text-transform: uppercase;
      }

      .quote-folio {
        font-size: 14px;
        color: var(--accent);
        font-weight: 600;
        margin-bottom: 15px;
      }

      /* --- CLIENT SECTION --- */
      .client-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 40px;
        background-color: #F8FAFC;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid var(--primary);
      }

      .client-box {
        flex: 1;
      }

      .client-box.shipping {
        margin-left: 30px;
      }

      .section-label {
        font-size: 11px;
        text-transform: uppercase;
        color: var(--text-light);
        font-weight: 700;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .client-name {
        font-size: 16px;
        font-weight: 700;
        color: var(--primary);
        margin: 0 0 4px 0;
      }

      .client-text {
        margin: 0 0 2px 0;
        color: var(--text-dark);
      }

      /* --- ITEMS TABLE --- */
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }

      th {
        background-color: var(--primary);
        color: white;
        text-transform: uppercase;
        font-size: 11px;
        font-weight: 600;
        padding: 12px 10px;
        text-align: left;
        letter-spacing: 0.5px;
      }

      th.center, td.center { text-align: center; }
      th.right, td.right { text-align: right; }

      td {
        padding: 12px 10px;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-dark);
      }

      tr:last-child td {
        border-bottom: 2px solid var(--primary);
      }

      .fw-bold { font-weight: 700; }

      /* --- TOTALS & FOOTER --- */
      .bottom-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-top: 20px;
      }

      .bank-details {
        flex: 1;
        background-color: #F8FAFC;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid var(--accent);
        margin-right: 40px;
      }

      .bank-details p {
        margin: 0 0 5px 0;
      }

      .totals-box {
        width: 250px;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 14px;
      }

      .total-row.grand-total {
        font-size: 20px;
        font-weight: 700;
        color: var(--primary);
        border-top: 2px solid var(--primary);
        padding-top: 15px;
        margin-top: 5px;
      }

      .grand-total .amount {
        color: var(--accent);
      }

      /* --- FOOTER NOTE --- */
      .footer-note {
        margin-top: 50px;
        text-align: center;
        font-size: 10px;
        color: var(--text-light);
        border-top: 1px solid var(--border-color);
        padding-top: 20px;
      }
    </style>
  </head>
  <body>

    <!-- HEADER -->
    <div class="header">
      <div class="logo-container">
        <img src="${logoBase64}" alt="Logo Empresa" />
        <div class="company-details">
          <strong>${company.name}</strong><br>
          RFC: ${company.rfc}<br>
          ${company.address}<br>
          ${company.email} | ${company.phone}
        </div>
      </div>
      <div class="quote-info">
        <h1 class="quote-title">Cotización</h1>
        <div class="quote-folio">${folio}</div>
        <div>Fecha: <strong>${dateStr}</strong></div>
      </div>
    </div>

    <!-- CLIENT INFO -->
    <div class="client-section">
      <div class="client-box">
        <div class="section-label">Datos de Facturación</div>
        <h2 class="client-name">${client.name}</h2>
        ${client.rfc ? `<p class="client-text"><strong>RFC:</strong> ${client.rfc}</p>` : ''}
        ${client.phone ? `<p class="client-text"><strong>Tel:</strong> ${client.phone}</p>` : ''}
      </div>
      <div class="client-box shipping">
        <div class="section-label">Dirección de Envío</div>
        <p class="client-text" style="white-space: pre-line;">
          ${client.address || 'No especificada'}
        </p>
      </div>
    </div>

    <!-- ITEMS -->
    <table>
      <thead>
        <tr>
          <th class="center" width="5%">#</th>
          <th width="15%">Clave</th>
          <th width="45%">Descripción</th>
          <th class="center" width="10%">Cant.</th>
          <th class="right" width="12%">P. Unitario</th>
          <th class="right" width="13%">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- BOTTOM SECTION -->
    <div class="bottom-section">
      <div class="bank-details">
        <div class="section-label" style="color: var(--accent);">Instrucciones de Pago</div>
        <p><strong>Banco:</strong> ${bankDetails.bank}</p>
        <p><strong>Cuenta:</strong> ${bankDetails.account}</p>
        <p><strong>CLABE:</strong> ${bankDetails.clabe}</p>
        <p style="font-size: 10px; margin-top: 10px; color: var(--text-light);">
          * Por favor incluya el folio ${folio} como referencia de pago.
        </p>
      </div>
      
      <div class="totals-box">
        <div class="total-row grand-total">
          <span>Total Neto</span>
          <span class="amount">$${total.toFixed(2)}</span>
        </div>
        <div style="text-align: right; font-size: 10px; color: var(--text-light); margin-top: 5px;">
          (IVA Incluido)
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer-note">
      Este documento es una cotización y no tiene validez fiscal hasta su facturación.<br>
      Precios sujetos a cambio sin previo aviso. Vigencia de 15 días.
    </div>

  </body>
  </html>
  `;
}

module.exports = { generateQuotationHtml };
