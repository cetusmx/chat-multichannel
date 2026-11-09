const { getProvider } = require('../providers');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/database');
/**
 * AI Service 
 * Acts as a facade to the AI Provider Adapter.
 */
class AIService {
  
  _formatProviderHistory(history) {
    let formatted = history.map(msg => {
      let content = msg.content ? String(msg.content) : '[Archivo adjunto]';
      if (msg.senderType !== 'CLIENT' && msg.senderType !== 'VENDOR' && content) {
        content = `[${msg.senderType}] ${content}`;
      }
      return {
        role: msg.senderType === 'CLIENT' ? 'user' : 'model',
        content
      };
    }).reverse();

    formatted = formatted.reduce((acc, curr) => {
      if (acc.length > 0 && acc[acc.length - 1].role === curr.role) {
        if (curr.content) {
          acc[acc.length - 1].content += (acc[acc.length - 1].content ? '\n' : '') + curr.content;
        }
      } else {
        acc.push(curr);
      }
      return acc;
    }, []);

    if (formatted.length === 0) {
      formatted.push({ role: 'user', content: '[Inicio de conversación]' });
    } else if (formatted[0].role !== 'user') {
      formatted.unshift({ role: 'user', content: '[Inicio de conversación]' });
    }
    
    return formatted;
  }

  async generateResponse(tenantId, messages, context = '', tools = undefined, toolHandlers = undefined) {
    try {
      const providerName = process.env.AI_PROVIDER || 'gemini';
      const provider = getProvider(providerName);
      return await provider.generateResponse({ messages, context, tenantId, tools, toolHandlers });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('AI Service Error: ' + error.message);
    }
  }

  async embed(tenantId, text) {
    try {
      const providerName = process.env.AI_PROVIDER || 'gemini';
      const provider = getProvider(providerName);
      return await provider.embed({ text, tenantId });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.internal('AI Service Embed Error: ' + error.message);
    }
  }

  /**
   * Builds the tool set for a conversation. Catalog-related tools are declared
   * from the tenant's CatalogConfig (schema + capabilities) so nothing here
   * knows about a particular ERP or product domain.
   *
   * @param {object} [catalogInfo] result of catalogService.describeForAi(); fetched when omitted
   */
  async _getAiToolsAndHandlers(tenantId, conversationId, conversation, catalogInfo = null) {
    const catalogService = require('./catalog.service');
    const promptService = require('./prompt.service');
    const catalog = catalogInfo || await catalogService.describeForAi(tenantId);
    const caps = catalog.capabilities || {};
    const promptConfig = await promptService.getPromptConfig(tenantId);
    const toolText = (name) => promptService.renderPath(promptConfig, `tools.${name}`);
    const noteText = (name, vars) => promptService.renderPath(promptConfig, `catalogNotes.${name}`, vars);

    const functionDeclarations = [];

    if (catalog.isConfigured && (caps.textSearch || caps.attributeSearch)) {
      functionDeclarations.push({
        name: "consultar_catalogo",
        description: toolText('consultar_catalogo'),
        parameters: catalog.toolParameters
      });
    }

    functionDeclarations.push({
      name: "actualizar_carrito",
      description: toolText('actualizar_carrito'),
      parameters: {
        type: "OBJECT",
        properties: {
          cart_items: {
            type: "STRING",
            description: "Un string JSON que representa un array de objetos con los productos del pedido actual. Ejemplo: '[{\"clave\": \"SKU-123\", \"descripcion\": \"Producto\", \"cantidad\": 2, \"precio\": 150}]'. El precio es el precio neto (IVA incluido) que devolvió el catálogo."
          },
          shipping_address: {
            type: "STRING",
            description: "Opcional. La dirección de envío depurada y con formato profesional (Calle, Número, Colonia, Código Postal, Ciudad, Estado). IMPORTANTE: NO pases el texto crudo del cliente, siempre corrígelo y dale formato antes."
          },
          razon_social: { type: "STRING", description: "Opcional. La Razón Social del cliente (si la extrajiste o la proporcionó)." },
          rfc: { type: "STRING", description: "Opcional. El RFC del cliente (si lo extrajiste o lo proporcionó)." },
          billing_address: { type: "STRING", description: "Opcional. El domicilio fiscal del cliente." }
        },
        required: ["cart_items"]
      }
    });

    if (caps.customerLookup) {
      functionDeclarations.push({
        name: "consultar_cliente_rfc",
        description: toolText('consultar_cliente_rfc'),
        parameters: {
          type: "OBJECT",
          properties: { rfc: { type: "STRING", description: "El RFC proporcionado por el cliente. Ejemplo: 'XAXX010101000'" } },
          required: ["rfc"]
        }
      });
    }

    functionDeclarations.push({
      name: "generar_cotizacion_pdf",
      description: toolText('generar_cotizacion_pdf'),
      parameters: {
        type: "OBJECT",
        properties: {
          razon_social: { type: "STRING", description: "Razón Social o nombre del cliente" },
          rfc: { type: "STRING", description: "RFC del cliente" },
          direccion: { type: "STRING", description: "Dirección completa del cliente (Calle, número, colonia, CP)" }
        },
        required: []
      }
    });

    if (caps.csfExtraction) {
      functionDeclarations.push({
        name: "extraer_constancia_fiscal",
        description: toolText('extraer_constancia_fiscal'),
        parameters: {
          type: "OBJECT",
          properties: { confirmar: { type: "BOOLEAN", description: "Siempre envía true" } }
        }
      });
    }

    functionDeclarations.push({
      name: "enviar_cotizacion_email",
      description: toolText('enviar_cotizacion_email'),
      parameters: {
        type: "OBJECT",
        properties: { email: { type: "STRING", description: "Correo electrónico del cliente" } },
        required: ["email"]
      }
    });

    const tools = [{ functionDeclarations }];

    const toolHandlers = {
      consultar_catalogo: async (args) => {
        try {
          console.log('[AI TOOL] consultar_catalogo invocado con args:', args);
          // Backward compatibility: older knowledge-base documents describe the
          // previous contract ({ query_params: '<json>' }). Accept and merge it.
          let searchArgs = { ...(args || {}) };
          if (typeof searchArgs.query_params === 'string') {
            try {
              searchArgs = { ...JSON.parse(searchArgs.query_params), ...searchArgs };
            } catch {
              return { error: 'query_params no es JSON válido; envía cada criterio como parámetro independiente.' };
            }
            delete searchArgs.query_params;
          }
          const { products, params } = await catalogService.search(tenantId, searchArgs, { limit: 50 });

          if (!products || products.length === 0) {
            return { resultados: [], total_encontrados: 0, criterios: params, nota: noteText('empty') };
          }

          // Keep the model's context small; the full list stays server side.
          const finalResults = products.slice(0, 5);
          let notaAdicional = noteText('limit');

          // One or two matches: push interactive cards to the customer and tell the model not to repeat them.
          if (finalResults.length <= 2) {
            const whatsappService = require('./whatsapp.service');
            const recentCards = await prisma.message.findMany({
              where: { conversationId, type: 'PRODUCT_CARD' },
              orderBy: { createdAt: 'desc' },
              take: 10
            });
            const recentSkus = recentCards.map(m => m.metadata && m.metadata.clave).filter(Boolean);

            let sentAny = false;
            for (const product of finalResults) {
              if (recentSkus.includes(product.sku)) continue;
              const metadata = {
                clave: product.sku,
                description: product.name,
                priceNet: product.priceNet != null ? product.priceNet.toFixed(2) : null,
                imageUrl: product.imageUrl,
                attributes: product.attributes,
                rawProduct: product.raw
              };
              try {
                await whatsappService.sendMessage(conversationId, '', null, 'SYSTEM', 'PRODUCT_CARD', metadata);
                sentAny = true;
              } catch (e) {
                console.error('[AI TOOL] Fallo al enviar PRODUCT_CARD:', e);
              }
            }

            notaAdicional = sentAny ? noteText('cardsSent') : noteText('cardsAlreadyVisible');
          }

          const showLocations = !!(catalog.capabilities && catalog.capabilities.stockByLocation);
          return {
            resultados: finalResults.map(p => ({
              clave: p.sku,
              nombre: p.name,
              descripcion: p.description || undefined,
              precio_neto: p.priceNet,
              precio_sin_iva: p.pricePreTax,
              moneda: p.currency,
              existencia_total: p.stock ? p.stock.total : null,
              existencia_por_sucursal: showLocations && p.stock ? p.stock.byLocation : undefined,
              unidad: p.unit || undefined,
              atributos: p.attributes
            })),
            total_encontrados: products.length,
            criterios: params,
            nota: `${notaAdicional} ${noteText('pricesAreNet')}`
          };
        } catch (e) {
          console.error('[AI TOOL] Excepción:', e.message);
          return { error: `Hubo un fallo al consultar el catálogo: ${e.message}` };
        }
      },
      actualizar_carrito: async (args) => {
        try {
          console.log('[AI TOOL] actualizar_carrito invocado con args:', args);
          let parsedItems = [];
          try {
            parsedItems = JSON.parse(args.cart_items);
            parsedItems = parsedItems.map(item => ({
              ...item,
              precio: item.precio || item.precio_unitario || 0
            }));
          } catch (e) {
            return { error: "El formato de cart_items no es un JSON válido." };
          }
          
          // Handle legacy format (if db has array) or new format (if db has object)
          const currentClient = await prisma.client.findUnique({ where: { id: conversation.clientId } });
          const currentCart = currentClient.cartData || {};
          
          const newCartData = {
            items: parsedItems,
            shippingAddress: args.shipping_address || (Array.isArray(currentCart) ? null : currentCart.shippingAddress),
            razonSocial: args.razon_social || (Array.isArray(currentCart) ? null : currentCart.razonSocial),
            rfc: args.rfc || (Array.isArray(currentCart) ? null : currentCart.rfc),
            billingAddress: args.billing_address || (Array.isArray(currentCart) ? null : currentCart.billingAddress)
          };

          if (conversation?.clientId) {
            await prisma.client.update({
              where: { id: conversation.clientId },
              data: { cartData: newCartData }
            });
            
            const io = require('../socket').getIo();
            io.of('/chat')
              .to(`tenant_${tenantId}_coordinators`)
              .to(`conversation:${conversationId}`)
              .emit('cart_updated', {
                clientId: conversation.clientId,
                cartData: newCartData
              });

            require('./timeline.service')
              .emitCartChanges({ id: conversationId, tenantId, vendorId: conversation.vendorId }, currentCart, newCartData, 'El cliente')
              .catch(() => {});

            console.log('[AI TOOL] actualizar_carrito procesado exitosamente.');
            return { status: "success", cartData: newCartData };
          }
          console.log('[AI TOOL] actualizar_carrito: Falló por falta de clientId.');
          return { error: "No se encontró el cliente asociado a esta conversación para guardar el carrito." };
        } catch (e) {
          console.error('[AI TOOL] Error en actualizar_carrito:', e.message);
          return { error: `Error al intentar guardar el carrito: ${e.message}` };
        }
      },
      consultar_cliente_rfc: async (args) => {
        try {
          console.log('[AI TOOL] consultar_cliente_rfc invocado con args:', args);
          const customer = await catalogService.lookupCustomer(tenantId, args.rfc);

          if (!customer) {
            return { status: "not_found", message: "No se encontró el RFC exacto en la base de datos." };
          }
          if (!customer.isActive) {
            return { status: "inactive", message: "El cliente existe pero no está activo en el sistema." };
          }

          // Save fiscal data to cartData instead of overwriting the WhatsApp client name
          if (conversation?.clientId) {
            const client = await prisma.client.findUnique({ where: { id: conversation.clientId } });
            const cartData = client.cartData || {};
            const newCartData = Array.isArray(cartData)
              ? { items: cartData, razonSocial: customer.legalName, rfc: customer.taxId, billingAddress: customer.address }
              : { ...cartData, razonSocial: customer.legalName, rfc: customer.taxId, billingAddress: customer.address };

            await prisma.client.update({
              where: { id: conversation.clientId },
              data: { cartData: newCartData }
            });
          }

          return { status: "success", razon_social: customer.legalName, rfc: customer.taxId, direccion: customer.address };
        } catch (e) {
          console.error('[AI TOOL] Excepción en consultar_cliente_rfc:', e.message);
          return { error: `Error al consultar el RFC: ${e.message}` };
        }
      },
      generar_cotizacion_pdf: async (args) => {
        try {
          console.log('[AI TOOL] generar_cotizacion_pdf invocado con args:', args);
          if (!conversation || !conversation.client) {
            return { status: 'error', message: 'No hay datos del cliente disponibles para generar la cotización.' };
          }
          
          let cartDataObj = conversation.client.cartData;
          let cartItems = [];
          if (Array.isArray(cartDataObj)) {
            cartItems = cartDataObj;
          } else if (cartDataObj && cartDataObj.items) {
            cartItems = cartDataObj.items;
          }

          if (!cartItems || cartItems.length === 0) {
            return { status: 'error', message: 'El carrito está vacío. Agrega productos primero.' };
          }

          const path = require('path');
          const fs = require('fs');
          const PdfGeneratorService = require('./pdf.service');
          const whatsappService = require('./whatsapp.service');
          
          const cData = conversation.client.cartData;
          const fallbackRazonSocial = Array.isArray(cData) ? null : cData?.razonSocial;
          const fallbackDireccion = Array.isArray(cData) ? null : cData?.shippingAddress;
          const fallbackRfc = Array.isArray(cData) ? null : cData?.rfc;
          const fallbackBilling = Array.isArray(cData) ? null : cData?.billingAddress;
          
          // Generate pseudo clientData for the PDF from args
          const clientDataForPdf = {
            name: args.razon_social || fallbackRazonSocial || conversation.client.name || 'Cliente General',
            chatName: conversation.client.name || '',
            RFC: args.rfc || fallbackRfc || '',
            billingAddress: fallbackBilling || args.direccion || '',
            address: fallbackDireccion || args.direccion || '',
            phone: conversation.client.phoneNumber || conversation.client.phone || ''
          };

          // Create a temp file path
          const tempDir = path.join(__dirname, '..', '..', 'uploads');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          const fileName = `Cotizacion_${conversation.client.id}_${Date.now()}.pdf`;
          const filePath = path.join(tempDir, fileName);

          // Get tenant (company) data
          const tenant = await prisma.tenant.findUnique({ where: { id: conversation.tenantId } });
          const companyData = tenant ? {
            name: tenant.name,
            address: tenant.address,
            rfc: tenant.rfc,
            email: tenant.email,
            phone: tenant.phone,
            bankDetails: tenant.bankDetails
          } : null;

          // Generate PDF
          await PdfGeneratorService.generateQuote(clientDataForPdf, cartItems, companyData, filePath);

          // Send via WhatsApp
          const fileObj = {
            path: filePath,
            mimetype: 'application/pdf',
            originalname: 'Cotizacion.pdf'
          };
          
          await whatsappService.sendMedia(
            conversationId,
            fileObj,
            '📄 *Aquí tienes tu Cotización Formal.*\nSi estás de acuerdo con ella, confírmame para proceder con los datos de envío y pago.',
            'IA',
            'IA',
            'Cotizacion.pdf'
          );

          // Cleanup local file after sending
          setTimeout(() => {
            fs.unlink(filePath, (err) => {
              if (err) console.error('Error deleting temp PDF:', err);
            });
          }, 10000);

          return { status: 'success', message: 'Cotización en PDF generada y enviada correctamente al chat del cliente.' };
        } catch (e) {
          console.error('[AI TOOL] Excepción en generar_cotizacion_pdf:', e);
          return { status: 'error', message: `Error al generar el PDF: ${e.message}` };
        }
      },
      enviar_cotizacion_email: async (args) => {
        try {
          console.log('[AI TOOL] enviar_cotizacion_email invocado con args:', args);
          if (!conversation || !conversation.client) {
            return { status: 'error', message: 'No hay datos del cliente disponibles para generar la cotización.' };
          }
          
          let cartDataObj = conversation.client.cartData;
          let cartItems = [];
          if (Array.isArray(cartDataObj)) {
            cartItems = cartDataObj;
          } else if (cartDataObj && cartDataObj.items) {
            cartItems = cartDataObj.items;
          }

          if (!cartItems || cartItems.length === 0) {
            return { status: 'error', message: 'El carrito está vacío. Agrega productos primero.' };
          }

          const path = require('path');
          const fs = require('fs');
          const PdfGeneratorService = require('./pdf.service');
          const EmailService = require('./email.service');
          
          const clientDataForPdf = {
            name: conversation.client.name || 'Cliente',
            chatName: conversation.client.name || '',
            RFC: '',
            billingAddress: '',
            address: '',
            phone: conversation.client.phoneNumber || conversation.client.phone || ''
          };

          const tempDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          const fileName = `Cotizacion_${conversation.client.id}_${Date.now()}.pdf`;
          const filePath = path.join(tempDir, fileName);

          const tenant = await prisma.tenant.findUnique({ where: { id: conversation.tenantId } });
          const companyData = tenant ? {
            name: tenant.name,
            address: tenant.address,
            rfc: tenant.rfc,
            email: tenant.email,
            phone: tenant.phone,
            bankDetails: tenant.bankDetails
          } : null;

          await PdfGeneratorService.generateQuote(clientDataForPdf, cartItems, companyData, filePath);
          
          await EmailService.sendQuotationEmail(args.email, clientDataForPdf.name, filePath, tenantId, companyData?.name || 'Ventas');

          setTimeout(() => {
            fs.unlink(filePath, (err) => {
              if (err) console.error('Error deleting temp PDF:', err);
            });
          }, 10000);

          return { status: 'success', message: 'Cotización enviada exitosamente al correo del cliente.' };
        } catch (e) {
          console.error('[AI TOOL] Excepción en enviar_cotizacion_email:', e);
          return { status: 'error', message: `Error al enviar el PDF por correo: ${e.message}` };
        }
      },
      extraer_constancia_fiscal: async () => {
        try {
          console.log('[AI TOOL] extraer_constancia_fiscal invocado');
          const lastPdfMsg = await prisma.message.findFirst({
            where: { conversationId, attachments: { some: { mimeType: 'application/pdf' } } },
            orderBy: { createdAt: 'desc' },
            include: { attachments: true }
          });
          if (!lastPdfMsg) return { status: 'error', message: 'No se encontró ningún archivo PDF en el historial reciente de esta conversación.' };

          const pdfAttachment = lastPdfMsg.attachments.find(a => a.mimeType === 'application/pdf');
          if (!pdfAttachment) return { status: 'error', message: 'El archivo no es un PDF.' };

          const fs = require('fs');
          const path = require('path');
          const pdfParse = require('pdf-parse');
          
          const relativePath = pdfAttachment.url.startsWith('/') ? pdfAttachment.url.slice(1) : pdfAttachment.url;
          const filePath = path.join(__dirname, '..', '..', relativePath);
          if (!fs.existsSync(filePath)) return { status: 'error', message: 'El archivo PDF no se pudo encontrar en el servidor local.' };

          const dataBuffer = fs.readFileSync(filePath);
          let pdfText = '';
          try {
            const data = await pdfParse(dataBuffer);
            pdfText = data.text;
          } catch (err) {
            return { status: 'error', message: `Error al intentar leer el PDF: ${err.message}` };
          }

          if (!pdfText.trim()) return { status: 'error', message: 'El documento está vacío o es una imagen escaneada sin texto legible.' };

          const actividadesEconIdx = pdfText.search(/Actividades Económicas/i);
          if (actividadesEconIdx !== -1) {
            pdfText = pdfText.substring(0, actividadesEconIdx);
          }

          let extractedRfc = '';
          let extractedRazonSocial = '';
          let extractedCp = '';
          let extractedAddress = '';

          const rfcMatch = pdfText.match(/RFC:\s*([A-Z0-9]{12,13})/i);
          const cpMatch = pdfText.match(/C\.\s*P\.\s*:\s*(\d{5})/i) || pdfText.match(/Código Postal:\s*(\d{5})/i);
          const nameMatch = pdfText.match(/Nombre,\s*denominación\s*o\s*razón\s*social:\s*([^\n]+)/i);

          if (rfcMatch) extractedRfc = rfcMatch[1].trim();

          // If the RFC is readable, prefer the ERP's customer record over parsing the rest of the PDF.
          if (extractedRfc) {
            try {
              const customer = await catalogService.lookupCustomer(tenantId, extractedRfc);
              if (customer && customer.isActive) {
                extractedAddress = customer.address;
                extractedRazonSocial = customer.legalName;
                extractedCp = (customer.raw && (customer.raw.CODIGO || customer.raw.cp || customer.raw.postalCode)) || '';

                let currentCart = conversation.client?.cartData || {};
                if (Array.isArray(currentCart)) currentCart = { items: currentCart };
                currentCart.rfc = extractedRfc;
                currentCart.razonSocial = extractedRazonSocial;
                currentCart.billingAddress = extractedAddress;
                await prisma.client.update({
                  where: { id: conversation.clientId },
                  data: { cartData: currentCart }
                });
                return { status: "success", message: "RFC encontrado en la base de datos.", razon_social: extractedRazonSocial, rfc: extractedRfc, direccion: extractedAddress };
              }
            } catch(e) {
              console.error("[CSF DB Try] Error querying customer lookup:", e.message);
            }
          }

          if (cpMatch) extractedCp = cpMatch[1].trim();
          if (nameMatch) extractedRazonSocial = nameMatch[1].trim();

          const extractBetween = (startStr, endStrs) => {
            let startIndex = pdfText.indexOf(startStr);
            if (startIndex === -1) return '';
            startIndex += startStr.length;
            let endIndex = pdfText.length;
            for (const endStr of endStrs) {
              const idx = pdfText.indexOf(endStr, startIndex);
              if (idx !== -1 && idx < endIndex) {
                endIndex = idx;
              }
            }
            return pdfText.substring(startIndex, endIndex).replace(/\n/g, ' ').trim();
          };

          const cpExt = extractBetween('CódigoPostal:\n', ['\n', 'Tipo']) || extractBetween('CódigoPostal:', ['Tipo', '\n']) || extractedCp;
          const vialidad = extractBetween('NombredeVialidad:', ['NúmeroExterior:', '\n']);
          const numExt = extractBetween('NúmeroExterior:', ['NúmeroInterior:', '\n']);
          const numInt = extractBetween('NúmeroInterior:', ['Nombredela Colonia:', '\n']);
          let colonia = extractBetween('Nombredela Colonia:\n', ['\n', 'Nombredela Localidad:']);
          if (!colonia) colonia = extractBetween('Nombredela Colonia:', ['Nombredela Localidad:', '\n']);
          const localidad = extractBetween('Nombredela Localidad:', ['NombredelMunicipio', '\n']);
          const municipio = extractBetween('DemarcaciónTerritorial:', ['Nombredela EntidadFederativa:', '\n']);
          const entidad = extractBetween('Nombredela EntidadFederativa:', ['EntreCalle:', '\n']);

          let direccionCompleta = [];
          if (vialidad) direccionCompleta.push(vialidad);
          if (numExt) direccionCompleta.push(numExt);
          if (numInt && numInt.trim().length > 0) direccionCompleta.push(numInt);
          if (colonia) direccionCompleta.push(colonia);
          if (localidad) direccionCompleta.push(localidad);
          if (municipio) direccionCompleta.push(municipio);
          if (entidad) direccionCompleta.push(entidad);
          if (cpExt) direccionCompleta.push(cpExt);

          extractedAddress = direccionCompleta.join(', ');

          if (!extractedRfc || !extractedRazonSocial || !extractedAddress) {
            // LLM Fallback explicitly since Regex failed
            try {
              const { getProvider } = require('../providers');
              const providerName = process.env.AI_PROVIDER || 'gemini';
              const provider = getProvider(providerName);
              
              const prompt = `Extrae de este texto crudo (proveniente de una Constancia de Situación Fiscal) el RFC, la Razón Social y el Domicilio Fiscal.
Para el Domicilio Fiscal, concatena los valores separándolos únicamente por comas en el siguiente orden: Vialidad, Número Exterior, Número Interior, Colonia, Localidad, Municipio, Entidad Federativa, Código Postal. Si no hay número interior, omítelo de la concatenación.
Devuelve ÚNICAMENTE un objeto JSON válido con las claves "rfc", "razonSocial" y "domicilioFiscal", sin texto adicional ni formato markdown.

TEXTO:
${pdfText.substring(0, 3000)}`;

              const response = await provider.generateResponse({ tenantId, messages: [{ role: 'user', content: prompt }] });
              let jsonStr = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(jsonStr);
              
              if (parsed.rfc) extractedRfc = parsed.rfc;
              if (parsed.razonSocial) extractedRazonSocial = parsed.razonSocial;
              if (parsed.domicilioFiscal) extractedAddress = parsed.domicilioFiscal;
            } catch (aiErr) {
              console.error('[CSF AI Fallback] error:', aiErr.message);
            }
          }

          if (!extractedRfc) {
             return { status: 'error', message: 'Se leyó el documento pero no se encontró ningún RFC válido. Probablemente no sea una constancia fiscal válida.' };
          }

          // Update cartData directly so the AI context refreshes correctly
          let currentCart = conversation.client?.cartData || {};
          if (Array.isArray(currentCart)) currentCart = { items: currentCart };
          
          currentCart.rfc = extractedRfc;
          if (extractedRazonSocial) currentCart.razonSocial = extractedRazonSocial;
          if (extractedAddress) currentCart.billingAddress = extractedAddress;

          await prisma.client.update({
            where: { id: conversation.clientId },
            data: { cartData: currentCart }
          });

          // Emit to frontend explicitly so the vendor sees the new RFC
          const io = require('../socket').getIo();
          io.of('/chat').to(`tenant_${tenantId}_coordinators`).to(`conversation:${conversationId}`).emit('cart_updated', {
            clientId: conversation.clientId,
            cartData: currentCart
          });

          return { 
            status: 'success', 
            message: 'Constancia analizada y datos agregados exitosamente al carrito/perfil.',
            datos_extraidos: { rfc: extractedRfc, razonSocial: extractedRazonSocial, codigoPostal: extractedCp }
          };
        } catch (e) {
          console.error('[AI TOOL] Excepción en extraer_constancia_fiscal:', e);
          return { status: 'error', message: `Error fatal: ${e.message}` };
        }
      }
    };

    return { tools, toolHandlers };
  }

  async generateAutoResponse(tenantId, conversationId, incomingText, options = {}) {
    if (!tenantId || !conversationId || !incomingText) {
      throw new ApiError(400, 'Missing required parameters for auto-response');
    }

    const { isOffHours = false } = options;

    try {
      // Fetch history
      const history = await prisma.message.findMany({
        where: { 
          conversationId,
          senderType: { in: ['CLIENT', 'IA', 'VENDOR'] },
          OR: [
            { content: { not: '' } },
            { attachments: { some: {} } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { attachments: true }
      });
      
      // Map history to provider format (in chronological order)
      const formattedHistory = this._formatProviderHistory(history);

      // Query RAG chunks
      let contextString = '';
      try {
        const knowledgeBaseService = require('./knowledgeBase.service');
        const chunks = await knowledgeBaseService.searchSimilarChunks(tenantId, incomingText, 3);
        if (chunks && chunks.length > 0) {
          contextString = chunks.filter(c => c && c.text).map(c => c.text).join('\n\n');
        }
      } catch (err) {
        console.warn('RAG search failed, continuing without context:', err.message);
      }

      // Fetch conversation to get Client and Cart Data
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { client: true }
      });
      const clientCart = conversation?.client?.cartData || [];

      // Fetch tenant to get timezone
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { businessHours: true, name: true }
      });
      const tz = tenant?.businessHours?.timezone || 'America/Mexico_City';
      const currentTimeStr = new Date().toLocaleString('es-MX', { 
        timeZone: tz, 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });

      // Fetch active vendors dynamically
      const activeVendorsList = await prisma.user.findMany({
        where: { tenantId, role: 'VENDOR', isActive: true },
        select: { name: true }
      });
      const vendorNames = activeVendorsList.map(v => v.name).join(', ') || 'Ninguno disponible';

      // Fetch AI Dictionary Rules
      const aiRulesList = await prisma.aiRule.findMany({
        where: { tenantId, isActive: true }
      });

      // Prompt text lives in the tenant's prompt configuration (defaults in
      // src/prompts/default.es.json); catalog knowledge in CatalogConfig.
      // This block only gathers variables and lets prompt.service compose.
      const catalogService = require('./catalog.service');
      const promptService = require('./prompt.service');
      const [catalogInfo, promptConfig] = await Promise.all([
        catalogService.describeForAi(tenantId),
        promptService.getPromptConfig(tenantId),
      ]);

      const promptVars = {
        company_name: tenant?.name || 'esta empresa',
        now: currentTimeStr,
        is_off_hours: !!isOffHours,
        vendors: vendorNames,
        cart_json: JSON.stringify(clientCart),
        custom_rules: aiRulesList.length > 0 ? aiRulesList.map(r => `- "${r.term}": ${r.definition}`).join('\n') : '',
        knowledge_context: contextString || '',
        has_knowledge_context: !!contextString,
        has_catalog: !!catalogInfo.isConfigured,
        catalog_description: catalogInfo.promptDescription || '',
        catalog_rules: catalogInfo.aiRules || '',
        tax_rate_pct: Math.round(((catalogInfo.pricing && catalogInfo.pricing.taxRate) || 0) * 100),
        has_fiscal_tools: !!(catalogInfo.capabilities && (catalogInfo.capabilities.customerLookup || catalogInfo.capabilities.csfExtraction)),
        can_lookup_customer: !!(catalogInfo.capabilities && catalogInfo.capabilities.customerLookup),
        can_extract_csf: !!(catalogInfo.capabilities && catalogInfo.capabilities.csfExtraction),
      };

      const baseSystemInstruction = promptService.composeAgentInstruction(promptConfig, promptVars);

      // ----------------------------------------------------
      // DEFINICIÓN DE HERRAMIENTAS GENÉRICAS (AGNOSTICAS)
      // ----------------------------------------------------
      const { tools, toolHandlers } = await this._getAiToolsAndHandlers(tenantId, conversationId, conversation, catalogInfo);
      const response = await this.generateResponse(tenantId, formattedHistory, baseSystemInstruction, tools, toolHandlers);
      
      const exactTokens = response.tokens;
      const promptLength = baseSystemInstruction.length + formattedHistory.reduce((acc, msg) => acc + (msg.content?.length || 0), 0);
      const fallbackTokens = Math.ceil((promptLength + (response.content?.length || 0)) / 4);
      const consumedTokens = exactTokens != null ? exactTokens : fallbackTokens;

      if (consumedTokens > 0) {
        try {
          await prisma.tenant.updateMany({
            where: { id: tenantId, licenseType: { not: 'LIFETIME' } },
            data: { currentMonthAiTokens: { increment: consumedTokens } }
          });
        } catch (e) {
          console.error('[AI_SERVICE] Failed to increment AI tokens:', e.message);
        }
      }

      return response.content;
    } catch (error) {
      console.error('[AI_SERVICE] Error generating auto-response:', error.message);
      throw error;
    }
  }

  /**
   * Generates a suggested draft reply for the vendor based on user prompt and conversation history.
   * Uses RAG context if applicable.
   * 
   * @param {string} tenantId - The tenant's ID
   * @param {string} conversationId - The conversation ID to pull history for
   * @param {string} userPrompt - The instruction from the vendor (e.g., 'Say hello')
   * @returns {Promise<string>} The generated draft text
   * @throws {ApiError} If parameters are missing
   */
  async generateInlineSuggestion(tenantId, conversationId, userPrompt) {
    if (!tenantId || !conversationId || !userPrompt) {
      throw new ApiError(400, 'Missing required parameters for inline suggestion');
    }

    try {
      const quotaService = require('./quota.service');
      const isQuotaExceeded = await quotaService.checkAiQuotaExceeded(tenantId);
      if (isQuotaExceeded) {
        throw new ApiError(403, 'Cuota de Inteligencia Artificial excedida', 'QUOTA_EXCEEDED');
      }

      const history = await prisma.message.findMany({
        where: { 
          conversationId,
          senderType: { in: ['CLIENT', 'IA', 'VENDOR'] },
          OR: [
            { content: { not: '' } },
            { attachments: { some: {} } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { attachments: true }
      });
      
      const formattedHistory = this._formatProviderHistory(history);

      let contextString = '';
      try {
        const knowledgeBaseService = require('./knowledgeBase.service');
        const lastClientMessage = history.find(m => m.senderType === 'CLIENT');
        const limitedClientContent = lastClientMessage && lastClientMessage.content ? lastClientMessage.content.substring(0, 1000) : '';
        const searchQuery = lastClientMessage ? `${userPrompt}: ${limitedClientContent}` : userPrompt;
        const chunks = await knowledgeBaseService.searchSimilarChunks(tenantId, searchQuery, 3);
        if (chunks && chunks.length > 0) {
          contextString = chunks.filter(c => c && c.text).map(c => c.text).join('\n\n');
        }
      } catch (err) {
        console.warn('RAG search failed for inline suggestion, continuing without context:', err.message);
      }

      const promptService = require('./prompt.service');
      const promptConfig = await promptService.getPromptConfig(tenantId);
      const systemInstruction = promptService.renderPath(promptConfig, 'inlineAssist', { knowledge_context: contextString || '' });

      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
        formattedHistory.push({ role: 'model', content: '[Esperando asistencia IA...]' });
      }
      formattedHistory.push({ role: 'user', content: `Vendor Prompt: ${userPrompt}` });

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { client: true }
      });
      const { tools, toolHandlers } = await this._getAiToolsAndHandlers(tenantId, conversationId, conversation);
      const response = await this.generateResponse(tenantId, formattedHistory, systemInstruction, tools, toolHandlers);
      
      const exactTokens = response.tokens;
      const promptLength = systemInstruction.length + formattedHistory.reduce((acc, msg) => acc + (msg.content?.length || 0), 0);
      const fallbackTokens = Math.ceil((promptLength + (response.content?.length || 0)) / 4);
      const consumedTokens = exactTokens != null ? exactTokens : fallbackTokens;

      if (consumedTokens > 0) {
        try {
          await prisma.tenant.updateMany({
            where: { id: tenantId, licenseType: { not: 'LIFETIME' } },
            data: { currentMonthAiTokens: { increment: consumedTokens } }
          });
        } catch (e) {
          console.error('[AI_SERVICE] Failed to increment AI tokens:', e.message);
        }
      }

      return response.content;
    } catch (error) {
      console.error('[AI_SERVICE] Error generating inline suggestion:', error.message);
      throw error;
    }
  }

}

module.exports = new AIService();
