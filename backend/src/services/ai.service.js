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
    const catalog = catalogInfo || await catalogService.describeForAi(tenantId);
    const caps = catalog.capabilities || {};

    const functionDeclarations = [];

    if (catalog.isConfigured && (caps.textSearch || caps.attributeSearch)) {
      functionDeclarations.push({
        name: "consultar_catalogo",
        description: "Busca productos en el catálogo del negocio. Pasa cada criterio como parámetro independiente. Antes de buscar, asegúrate de tener TODOS los parámetros marcados como OBLIGATORIOS; si falta alguno, pregúntaselo al cliente en lugar de adivinar. Nunca inventes valores que no estén en la lista de valores válidos del contexto.",
        parameters: catalog.toolParameters
      });
    }

    functionDeclarations.push({
      name: "actualizar_carrito",
      description: "Actualiza el estado persistente del carrito de compras del cliente. Úsala CADA VEZ que el cliente confirme que quiere agregar un producto o modificar cantidades, o cuando confirme su dirección de envío o envíe sus datos fiscales.",
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
        description: "Busca los datos fiscales y comerciales de un cliente a partir de su RFC. Úsala cuando el cliente te proporcione su RFC para una cotización.",
        parameters: {
          type: "OBJECT",
          properties: { rfc: { type: "STRING", description: "El RFC proporcionado por el cliente. Ejemplo: 'XAXX010101000'" } },
          required: ["rfc"]
        }
      });
    }

    functionDeclarations.push({
      name: "generar_cotizacion_pdf",
      description: "Genera un PDF con la cotización formal de los artículos en el carrito y lo envía al cliente. Úsala SOLAMENTE cuando el cliente te pida explícitamente generar o enviarle la cotización formal en PDF.",
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
        description: "Lee y extrae RFC, Razón Social y Código Postal del último archivo PDF adjunto enviado por el cliente (Constancia de Situación Fiscal o similar). Úsala cuando el cliente haya enviado un archivo adjunto para sus datos fiscales de facturación.",
        parameters: {
          type: "OBJECT",
          properties: { confirmar: { type: "BOOLEAN", description: "Siempre envía true" } }
        }
      });
    }

    functionDeclarations.push({
      name: "enviar_cotizacion_email",
      description: "Envía la cotización actual por correo electrónico al cliente. Úsala cuando el cliente solicite que se le envíe la cotización a un email específico.",
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
            return { resultados: [], total_encontrados: 0, criterios: params, nota: 'Sin resultados. Pide al cliente que verifique los datos o pruebe con otros criterios.' };
          }

          // Keep the model's context small; the full list stays server side.
          const finalResults = products.slice(0, 5);
          let notaAdicional = 'Se muestran máximo 5 resultados. Si hay más, pide al cliente que sea más específico.';

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

            notaAdicional = sentAny
              ? "IMPORTANTE: Ya se le enviaron automáticamente las TARJETAS INTERACTIVAS de estos productos al cliente por WhatsApp. En tu respuesta de texto, NO vuelvas a listar los productos ni des precios. Simplemente dile: 'Te he enviado las opciones aquí arriba en formato de tarjeta. ¿Te interesa alguna para agregarla a tu pedido?' o algo similar, pero muy breve."
              : 'Nota: El cliente ya tiene las tarjetas de estos productos visibles en el chat. Procede a responderle de forma natural (ej. preguntando cuántas piezas necesita o resolviendo su duda).';
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
            nota: `${notaAdicional} Los precios en 'precio_neto' YA incluyen IVA: muéstralos tal cual como "Precio Neto (IVA incluido)".`
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
        select: { businessHours: true }
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
      let customRulesString = '';
      if (aiRulesList.length > 0) {
        customRulesString = '\n[REGLAS Y DICCIONARIO PERSONALIZADO]\n' + aiRulesList.map(r => `- "${r.term}": ${r.definition}`).join('\n');
      }

      const dynamicContext = `
[DATOS EN TIEMPO REAL DEL SISTEMA]
- Fecha y hora actual en la ubicación del negocio: ${currentTimeStr}
- ¿Fuera de horario laboral?: ${isOffHours ? 'SÍ (Estamos cerrados)' : 'NO (Estamos abiertos)'}
- Equipo de vendedores: ${vendorNames}
- CARRITO DE COMPRAS DEL CLIENTE: ${JSON.stringify(clientCart)}
- Instrucción de Carrito: Este es el estado persistente del carrito. Usa la herramienta 'actualizar_carrito' para modificarlo si el cliente pide agregar o quitar algo.
- Instrucción dinámica: Si el cliente pregunta por un vendedor específico que esté en el equipo, indícale si estamos dentro o fuera de horario e incluye [[ESCALATE]] para asignarle el chat a esa persona.${customRulesString}
[FIN DE DATOS]
`;

      // Catalog knowledge comes from the tenant's CatalogConfig: search attributes,
      // allowed values and domain rules. Nothing product-specific lives in code.
      const catalogService = require('./catalog.service');
      const catalogInfo = await catalogService.describeForAi(tenantId);
      let catalogBlock = '';
      if (catalogInfo.isConfigured) {
        catalogBlock = `
[CATÁLOGO DE PRODUCTOS]
Criterios de búsqueda disponibles en la herramienta 'consultar_catalogo':
${catalogInfo.promptDescription}
Reglas del catálogo:
- Antes de buscar, reúne TODOS los criterios marcados como OBLIGATORIOS preguntándoselos al cliente; nunca los inventes.
- Usa ÚNICAMENTE valores que aparezcan en las listas de valores válidos. Si el cliente usa un término que no está ahí, pídele que precise o muéstrale las opciones válidas.
- Si el cliente indica una unidad para una medida y luego omite la unidad en otras, asume la misma unidad.
- La herramienta devuelve 'precio_neto' con IVA incluido (tasa ${Math.round(catalogInfo.pricing.taxRate * 100)}%): muéstralo tal cual como "Precio Neto (IVA incluido)" y usa esos mismos precios para sumar cotizaciones. Nunca recalcules impuestos.
${catalogInfo.aiRules ? `Reglas específicas del negocio:\n${catalogInfo.aiRules}` : ''}
[FIN CATÁLOGO]`;
      } else {
        catalogBlock = `
[CATÁLOGO DE PRODUCTOS]
Este negocio no tiene catálogo conectado. No inventes productos, precios ni existencias; responde con la base de conocimientos y, si el cliente pide precios o disponibilidad, incluye [[ESCALATE]] para que un asesor lo atienda.
[FIN CATÁLOGO]`;
      }

      const fiscalRules = catalogInfo.capabilities?.customerLookup || catalogInfo.capabilities?.csfExtraction
        ? `3. COTIZACIONES Y RFC: Si el cliente solicita explícitamente una cotización formal, primero pregúntale su RFC. Si responde que no tiene, asume que es un cliente genérico (Mostrador).${catalogInfo.capabilities.csfExtraction ? " Si en lugar de escribir el RFC, el cliente envía un archivo adjunto (como un PDF), ASUME INMEDIATAMENTE que se trata de su Constancia de Situación Fiscal (CSF) y llama a la herramienta 'extraer_constancia_fiscal' SIN pedirle confirmación." : ''}${catalogInfo.capabilities.customerLookup ? " Si el cliente escribe su RFC manualmente, usa la herramienta 'consultar_cliente_rfc'." : ''} Si alguna de las herramientas devuelve 'success', CONFÍRMALE AL CLIENTE que encontraste sus datos (menciónale su Razón Social) y dile que con esos datos se elaborará la cotización. MUY IMPORTANTE: Guarda celosamente la "razon_social" y la "direccion" exactas que te devuelvan. Cuando llames a 'generar_cotizacion_pdf', pásale esa "razon_social" exacta en los argumentos (NUNCA pases el nombre de pila o nombre de WhatsApp del cliente). NOTA: El PDF generado YA CONTIENE automáticamente los datos bancarios y las instrucciones de pago de la empresa; NO le digas al cliente que se los enviarás después, indícale que los datos bancarios vienen dentro del documento PDF adjunto.`
        : `3. COTIZACIONES: Si el cliente solicita una cotización formal, pídele su RFC o nombre/razón social para el documento. Cuando llames a 'generar_cotizacion_pdf', pasa exactamente el nombre o razón social que te indique. El PDF ya incluye los datos bancarios de la empresa.`;

      const aiRules = `
[REGLAS ESTRICTAS DE COMPORTAMIENTO]
1. PEDIDOS Y CARRITO: Tu rol incluye TOMAR EL PEDIDO. Ve recordando internamente qué productos y cantidades confirma el cliente. SIEMPRE usa la herramienta 'actualizar_carrito' para guardar este estado.
2. FORMATO DE RESULTADOS: Cuando muestres productos, NO satures el chat. Muestra ÚNICAMENTE la clave, el nombre o descripción breve, el precio neto y la existencia total.
${fiscalRules}
4. DATOS DE ENVÍO Y ESCALAMIENTO: Cuando el cliente confirme el pedido, te solicite datos bancarios y llegue el momento de coordinar el envío, ANTES de transferirlo a un humano, solicítale su Código Postal y Dirección de Envío completa. Si el cliente te da una dirección pero omite el Código Postal, DEBES pedirle específicamente el Código Postal antes de avanzar. Si previamente obtuviste sus datos fiscales, PREGÚNTALE si la dirección de envío es la misma que su dirección fiscal, MOSTRÁNDOSELA explícitamente. Una vez que tengas la dirección de envío completa (incluyendo Código Postal), DEBES corregir cualquier falta de ortografía y capitalizar correctamente los nombres propios de la dirección. Luego, DEBES invocar OBLIGATORIAMENTE la herramienta 'actualizar_carrito' para inyectar y guardar esa dirección corregida. Después de guardar la dirección, APLICA LA REGLA 6.
5. RECOLECCIÓN EN SUCURSAL: Si el cliente indica que desea pasar a recoger los productos a una sucursal, ACÉPTALO de inmediato (no te muestres renuente). Ofrécele generarle la cotización y, MUY IMPORTANTE, APLICA LA REGLA 6.
6. REGLA DE ORO ANTES DE ESCALAR (CUALQUIER FLUJO): IMPORTANTE: Sin importar cuál haya sido la última petición o respuesta del cliente, NUNCA ASUMAS QUE LA INTERACCIÓN HA TERMINADO. Siempre debes preguntarle al cliente si requiere consultar algún otro producto o necesita ayuda con algo más. **ESTÁ ESTRICTAMENTE PROHIBIDO COLOCAR LA ETIQUETA [[ESCALATE]] EN EL MISMO MENSAJE DONDE LE PREGUNTAS SI REQUIERE ALGO MÁS.** Primero haz la pregunta y espera a que el cliente responda. SÓLO si el cliente responde que ya no necesita nada más, entonces procedes a despedirte y AHORA SÍ colocas la etiqueta [[ESCALATE]]. Si el cliente dice que sí quiere agregar otro producto, ayúdalo con eso y no escales el chat todavía.
${catalogBlock}
`;

      let baseSystemInstruction = '';
      if (!contextString && !catalogInfo.isConfigured) {
        baseSystemInstruction = `Eres un asistente de ventas de esta empresa. No tienes información de la base de conocimientos ni catálogo para esta consulta. Sé amable, responde de forma general y DEBES incluir la cadena exacta [[ESCALATE]] en cualquier parte de tu respuesta para que un humano tome el chat.\n${dynamicContext}`;
      } else if (!contextString) {
        // Catalog is available even though no knowledge-base chunk matched this message.
        baseSystemInstruction = `Eres un asistente de ventas de esta empresa. Para esta consulta no hay fragmentos relevantes de la base de conocimientos; apóyate en el catálogo y en las reglas siguientes. Si el cliente pregunta por políticas, pagos, envíos o garantías que no conoces, o pide hablar con un humano, DEBES incluir la cadena exacta [[ESCALATE]] en cualquier parte de tu respuesta.\n${aiRules}\n${dynamicContext}`;
      } else {
        baseSystemInstruction = `Eres un asistente de ventas de esta empresa. Usa ÚNICAMENTE el siguiente contexto de la base de conocimientos para responder sobre políticas y datos del negocio, y la herramienta de catálogo para productos. Si el cliente pide explícitamente hablar con un humano, pregunta por un vendedor específico, o si no sabes la respuesta basada en el contexto, DEBES incluir la cadena exacta [[ESCALATE]] en cualquier parte de tu respuesta.\n${aiRules}\n\nContexto:\n${contextString}\n${dynamicContext}`;
      }

      if (isOffHours) {
        baseSystemInstruction += `\nAl estar fuera de horario laboral, preséntate brevemente como Inteligencia Artificial e infórmale al cliente que estamos cerrados. Usa el dato de 'Fecha y hora actual' EXCLUSIVAMENTE de forma interna para contextualizar tu respuesta de forma natural, pero TIENES ESTRICTAMENTE PROHIBIDO mencionar la hora o el día literal en tu mensaje (NUNCA digas cosas como "son las 11:23 p.m." ni "hoy es martes"). Úsalo solo para saber si debes decir "en unas horas más" (madrugada), "mañana a primera hora" (noche), o "el lunes" (sábado/domingo), y despídete acorde a la hora (ej. "buenas noches", "excelente fin de semana"). ESTÁ ESTRICTAMENTE PROHIBIDO hacerle preguntas al cliente (como "¿En qué te puedo ayudar?") o invitarlo a seguir conversando. Termina el mensaje despidiéndote e incluye siempre la etiqueta [[ESCALATE]].`;
      }

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

      const systemInstruction = `You are an AI assistant helping a human sales representative (Vendor) draft a reply to a client or perform actions on their behalf. 
Use the following context from our knowledge base (if any) and the conversation history to draft an accurate and helpful response.
Do NOT include [[ESCALATE]] in this context. You must follow the exact instruction provided by the Vendor Prompt.
If the Vendor Prompt requests you to use a tool (such as updating the cart), YOU MUST EXECUTE THAT TOOL.
When drafting a reply, draft ONLY the text that the vendor should send to the client. Do not include quotes or commentary.

Context:
${contextString}`;

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
