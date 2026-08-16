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

      const aiRules = `
[REGLAS ESTRICTAS DE COMPORTAMIENTO]
1. NUNCA inventes familias de productos, opciones, ni des ejemplos que no estén literalmente listados en tu texto de Contexto provisto. Si el cliente menciona un término genérico (ej. "guías", "tapas") y en tu contexto no se detallan las clasificaciones o familias de ese término, BAJO NINGUNA CIRCUNSTANCIA uses tu conocimiento previo (pre-entrenamiento) para sugerir variantes inventadas (ej. "anillos guía", "cintas guía"). Si no está textualmente en el Contexto, NO EXISTE. Simplemente indícale al cliente que necesitas que especifique la familia correcta o bríndale únicamente las opciones que SÍ aparecen en tu contexto.
2. Si menciona una unidad (ej. "50 mm") y luego da otras medidas sin unidad, asume SIEMPRE que comparten la misma unidad (mm).
3. FRACCIONES Y PULGADAS: Si el cliente proporciona una medida en fracciones (ej. "1 5/16" o "3/4"), asume INMEDIATAMENTE que se trata del sistema "std" (pulgadas).
4. CONVERSIÓN A DECIMAL: Antes de consultar el catálogo con una fracción, DEBES convertir matemáticamente la fracción a decimales en milésimas. Ejemplo: "1 5/16" debes enviarlo como "1.312" (o 1.3125) en el JSON de consulta.
5. Asegúrate de mapear los parámetros de catálogo tal y como los espera la API.
6. EXISTENCIAS: La API te devuelve el inventario desglosado por sucursal. Por defecto, DEBES SUMARLO y decirle al cliente ÚNICAMENTE el TOTAL GLOBAL disponible sin mencionar sucursales. EXCEPCIÓN: Si el cliente pregunta explícitamente si hay existencia en una ciudad o sucursal específica, verifica en el JSON si hay existencias ahí. Si sí hay, confírmale que SÍ tenemos en esa ciudad y pregúntale si conoce la dirección de la sucursal (NUNCA le digas la cantidad exacta que hay en la sucursal, solo dile que sí hay).
7. SIN STOCK: Aunque el producto tenga existencia 0, SIEMPRE ofrécele la información y bríndale el precio.
8. SIN PRECIO: Si un producto tiene precio $0 o nulo, NO le muestres el precio. Simplemente dile que "más tarde un asesor lo contactará para proporcionarle el precio exacto" y ofrécele seguir buscando más productos.
9. PEDIDOS Y CARRITO: Tu rol incluye TOMAR EL PEDIDO. Ve recordando internamente qué productos y cantidades confirma el cliente. SIEMPRE usa la herramienta 'actualizar_carrito' para guardar este estado.
10. FORMATO DE RESULTADOS Y PRECIOS: Cuando muestres productos, NO satures el chat. Muestra ÚNICAMENTE la clave del artículo, la descripción breve, el precio neto (ya con el 16% de IVA incluido) y el total global de existencias. TODOS los precios que devuelva el catálogo están antes de impuestos. DEBES multiplicar siempre el precio por 1.16 y mostrar el resultado final indicando explícitamente "Precio Neto (IVA Incluido)". Haz lo mismo para la suma total de cotizaciones.
11. COTIZACIONES Y RFC: Si el cliente solicita explícitamente una cotización formal, primero pregúntale su RFC. Si responde que no tiene, asume que es un cliente genérico (Mostrador). Si proporciona un RFC, usa la herramienta 'consultar_cliente_rfc'. Si el resultado es 'success', CONFÍRMALE AL CLIENTE que encontraste sus datos (menciónale su Razón Social / NOMBRE) y dile que con esos datos se elaborará la cotización. MUY IMPORTANTE: Guarda celosamente la "razon_social" y la "direccion" exactas que te devuelva esa herramienta. Cuando llames a 'generar_cotizacion_pdf', pásale esa "razon_social" exacta en los argumentos (NUNCA pases el nombre de pila o nombre de WhatsApp del cliente). NOTA: El PDF generado YA CONTIENE automáticamente los datos bancarios y las instrucciones de pago de la empresa; NO le digas al cliente que se los enviarás después, indícale que los datos bancarios vienen dentro del documento PDF adjunto.
12. DATOS DE ENVÍO Y ESCALAMIENTO: Cuando el cliente confirme el pedido, te solicite datos bancarios y llegue el momento de coordinar el envío, ANTES de transferirlo a un humano, solicítale su Código Postal y Dirección de Envío completa. Si el cliente te da una dirección pero omite el Código Postal, DEBES pedirle específicamente el Código Postal antes de avanzar. Si previamente obtuviste sus datos fiscales, PREGÚNTALE si la dirección de envío es la misma que su dirección fiscal, MOSTRÁNDOSELA explícitamente. Una vez que tengas la dirección de envío completa (incluyendo Código Postal), DEBES corregir cualquier falta de ortografía y capitalizar correctamente los nombres propios de la dirección. Luego, DEBES invocar OBLIGATORIAMENTE la herramienta 'actualizar_carrito' para inyectar y guardar esa dirección corregida. Después de guardar la dirección, APLICA LA REGLA 14.
13. RECOLECCIÓN EN SUCURSAL: Si el cliente indica que desea pasar a recoger los productos a una sucursal, ACÉPTALO de inmediato (no te muestres renuente). Ofrécele generarle la cotización y, MUY IMPORTANTE, APLICA LA REGLA 14.
14. REGLA DE ORO ANTES DE ESCALAR (CUALQUIER FLUJO): IMPORTANTE: Sin importar cuál haya sido la última petición o respuesta del cliente, NUNCA ASUMAS QUE LA INTERACCIÓN HA TERMINADO. Siempre debes preguntarle al cliente si requiere consultar algún otro producto o necesita ayuda con algo más. **ESTÁ ESTRICTAMENTE PROHIBIDO COLOCAR LA ETIQUETA [[ESCALATE]] EN EL MISMO MENSAJE DONDE LE PREGUNTAS SI REQUIERE ALGO MÁS.** Primero haz la pregunta y espera a que el cliente responda. SÓLO si el cliente responde que ya no necesita nada más, entonces procedes a despedirte y AHORA SÍ colocas la etiqueta [[ESCALATE]]. Si el cliente dice que sí quiere agregar otro producto, ayúdalo con eso y no escales el chat todavía.
`;

      let baseSystemInstruction = '';
      if (!contextString) {
        baseSystemInstruction = `Eres un asistente de ventas de esta empresa. Actualmente no tienes documentos en tu base de conocimientos. Sé amable, responde de forma general y DEBES incluir la cadena exacta [[ESCALATE]] en cualquier parte de tu respuesta para que un humano tome el chat.\n${dynamicContext}`;
      } else {
        baseSystemInstruction = `Eres un asistente de ventas de esta empresa. Usa ÚNICAMENTE el siguiente contexto de la base de conocimientos para responder. Si el cliente pide explícitamente hablar con un humano, pregunta por un vendedor específico, o si no sabes la respuesta basada en el contexto, DEBES incluir la cadena exacta [[ESCALATE]] en cualquier parte de tu respuesta.\n${aiRules}\n\nContexto:\n${contextString}\n${dynamicContext}`;
      }

      if (isOffHours) {
        baseSystemInstruction += `\nAl estar fuera de horario laboral, preséntate brevemente como Inteligencia Artificial e infórmale al cliente que estamos cerrados. Usa el dato de 'Fecha y hora actual' EXCLUSIVAMENTE de forma interna para contextualizar tu respuesta de forma natural, pero TIENES ESTRICTAMENTE PROHIBIDO mencionar la hora o el día literal en tu mensaje (NUNCA digas cosas como "son las 11:23 p.m." ni "hoy es martes"). Úsalo solo para saber si debes decir "en unas horas más" (madrugada), "mañana a primera hora" (noche), o "el lunes" (sábado/domingo), y despídete acorde a la hora (ej. "buenas noches", "excelente fin de semana"). ESTÁ ESTRICTAMENTE PROHIBIDO hacerle preguntas al cliente (como "¿En qué te puedo ayudar?") o invitarlo a seguir conversando. Termina el mensaje despidiéndote e incluye siempre la etiqueta [[ESCALATE]].`;
      }

      // ----------------------------------------------------
      // DEFINICIÓN DE HERRAMIENTAS GENÉRICAS (AGNOSTICAS)
      // ----------------------------------------------------
      const tools = [{
        functionDeclarations: [
          {
            name: "consultar_catalogo",
            description: "Busca productos en el catálogo. Extrae los parámetros de búsqueda en JSON. REGLA DE ORO: El parámetro 'familia' es ESTRICTAMENTE OBLIGATORIO en TODAS las consultas. Si no tienes la certeza de cuál es el nombre EXACTO de la familia según el Contexto, NO inventes nombres (ej. no inventes 'ANILLOS GUIA' ni 'CINTA GUIA') y mejor pregúntale al usuario a qué se refiere. Si menciona una unidad (ej. mm), asume la misma para las demás (sist_med).",
            parameters: {
              type: "OBJECT",
              properties: {
                query_params: {
                  type: "STRING",
                  description: "Un string en formato JSON válido con las claves y valores a buscar. Ejemplo: '{\"familia\": \"ORINGS\", \"diam_int\": \"50\", \"diam_ext\": \"60\", \"altura\": \"6\", \"sist_med\": \"mm\"}'"
                }
              },
              required: ["query_params"]
            }
          },
          {
            name: "actualizar_carrito",
            description: "Actualiza el estado persistente del carrito de compras del cliente. Úsala CADA VEZ que el cliente confirme que quiere agregar un producto o modificar cantidades, o cuando confirme su dirección de envío o envíe sus datos fiscales.",
            parameters: {
              type: "OBJECT",
              properties: {
                cart_items: {
                  type: "STRING",
                  description: "Un string JSON que representa un array de objetos con los productos del pedido actual. Ejemplo: '[{\"clave\": \"OR-050\", \"descripcion\": \"Oring 50mm\", \"cantidad\": 2, \"precio\": 150}]'"
                },
                shipping_address: {
                  type: "STRING",
                  description: "Opcional. La dirección de envío completa que el cliente ha confirmado para este pedido."
                },
                razon_social: {
                  type: "STRING",
                  description: "Opcional. La Razón Social del cliente (si la extrajiste o la proporcionó)."
                },
                rfc: {
                  type: "STRING",
                  description: "Opcional. El RFC del cliente (si lo extrajiste o lo proporcionó)."
                },
                billing_address: {
                  type: "STRING",
                  description: "Opcional. El domicilio fiscal del cliente."
                }
              },
              required: ["cart_items"]
            }
          },
          {
            name: "consultar_cliente_rfc",
            description: "Busca los datos fiscales y comerciales de un cliente a partir de su RFC. Úsala cuando el cliente te proporcione su RFC para una cotización.",
            parameters: {
              type: "OBJECT",
              properties: {
                rfc: {
                  type: "STRING",
                  description: "El RFC proporcionado por el cliente. Ejemplo: 'XAXX010101000'"
                }
              },
              required: ["rfc"]
            }
          },
          {
            name: "generar_cotizacion_pdf",
            description: "Genera un PDF con la cotización formal de los artículos en el carrito y lo envía al cliente. Úsala SOLAMENTE cuando el cliente te pida explícitamente generar o enviarle la cotización formal en PDF.",
            parameters: {
              type: "OBJECT",
              properties: {
                razon_social: {
                  type: "STRING",
                  description: "Razón Social o nombre del cliente"
                },
                rfc: {
                  type: "STRING",
                  description: "RFC del cliente"
                },
                direccion: {
                  type: "STRING",
                  description: "Dirección completa del cliente (Calle, número, colonia, CP)"
                }
              },
              required: []
            }
          },
          {
            name: "extraer_constancia_fiscal",
            description: "Lee y extrae RFC, Razón Social y Código Postal del último archivo PDF adjunto enviado por el cliente (Constancia de Situación Fiscal o similar). Úsala cuando el cliente haya enviado un archivo adjunto para sus datos fiscales de facturación.",
            parameters: {
              type: "OBJECT",
              properties: {
                confirmar: { type: "BOOLEAN", description: "Siempre envía true" }
              }
            }
          },
          {
            name: "enviar_cotizacion_email",
            description: "Envía la cotización actual por correo electrónico al cliente. Úsala cuando el cliente solicite que se le envíe la cotización a un email específico.",
            parameters: {
              type: "OBJECT",
              properties: {
                email: {
                  type: "STRING",
                  description: "Correo electrónico del cliente"
                }
              },
              required: ["email"]
            }
          }
        ]
      }];

      const toolHandlers = {
        consultar_catalogo: async (args) => {
          try {
            console.log('[AI TOOL] consultar_catalogo invocado con args:', args);
            const paramsStr = args.query_params;
            const parsedParams = JSON.parse(paramsStr);
            
            const searchParams = new URLSearchParams(parsedParams);
            searchParams.set('limit', '100'); // Solicitar suficientes registros para no perder vivos en páginas posteriores
            // TODO: En el futuro esto debe leerse de la base de datos (Tenant.catalogApiUrl)
            const apiUrl = process.env.VITE_API_BASE_URL || 'http://75.119.150.222:3010';
            const apiKey = process.env.VITE_INTERNAL_SECRET || 'sm_ecommerce_x2ve9yFf0aiDxh1HelezpVeyRAcngGwgEg3ZnSZwhGg2SaZrd2gQiysiVo86R3LcUZFFxZDSMADepof1jMLSumIbiqBRcbjyhvA78haaxnLrrbOuU3zqCi0kQXJf1gSc';
            
            const endpoint = `${apiUrl}/api/clavesalternas/filter-v2?${searchParams.toString()}`;
            console.log('[AI TOOL] Fetching API:', endpoint);
            
            const fetchRes = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
              }
            });
            
            if (!fetchRes.ok) {
              console.error('[AI TOOL] API HTTP Error:', fetchRes.status);
              return { error: `El catálogo devolvió un error: ${fetchRes.statusText}` };
            }
            
            const data = await fetchRes.json();
            let results = data.data || [];
            
            if (Array.isArray(results) && results.length > 0) {
              // 1. Omitir productos "muertos" (precio 0, sin stock, y sin fecha de última compra)
              results = results.filter(item => {
                const totalExt = Object.values(item.existencias || {}).reduce((a, b) => a + (b || 0), 0);
                const isDead = (!item.PRECIO || item.PRECIO === 0) && totalExt === 0 && !item.FCH_ULTCOM;
                return !isDead;
              });

              // 2. Priorizar productos con existencia si hay múltiples opciones
              if (results.length > 1) {
                const conExistencia = results.filter(item => {
                  const totalExt = Object.values(item.existencias || {}).reduce((a, b) => a + (b || 0), 0);
                  return totalExt > 0;
                });
                
                if (conExistencia.length > 0) {
                  results = conExistencia;
                } else {
                  // Si TODOS están agotados, solo mostrar los que tienen fecha de última compra (FCH_ULTCOM != null)
                  results = results.filter(item => item.FCH_ULTCOM);
                }
              }

              // Limitar los resultados a 5 para no reventar la memoria de contexto de Gemini
              return { 
                resultados: results.slice(0, 5), 
                total_encontrados: results.length,
                nota: "Se están mostrando máximo 5 resultados. Si hay más, pide al cliente que sea más específico." 
              };
            }
            return data;
          } catch (e) {
            console.error('[AI TOOL] Excepción:', e.message);
            return { error: `Hubo un fallo al leer los parámetros o conectar con el catálogo: ${e.message}` };
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
              return { status: "success", cartData: newCartData };
            }
            return { error: "No se encontró el cliente asociado a esta conversación para guardar el carrito." };
          } catch (e) {
            console.error('[AI TOOL] Error en actualizar_carrito:', e.message);
            return { error: `Error al intentar guardar el carrito: ${e.message}` };
          }
        },
        consultar_cliente_rfc: async (args) => {
          try {
            console.log('[AI TOOL] consultar_cliente_rfc invocado con args:', args);
            const rfc = args.rfc;
            
            const apiUrl = process.env.VITE_API_BASE_URL || 'http://75.119.150.222:3010';
            const apiKey = process.env.VITE_INTERNAL_SECRET || 'sm_ecommerce_x2ve9yFf0aiDxh1HelezpVeyRAcngGwgEg3ZnSZwhGg2SaZrd2gQiysiVo86R3LcUZFFxZDSMADepof1jMLSumIbiqBRcbjyhvA78haaxnLrrbOuU3zqCi0kQXJf1gSc';
            
            const endpoint = `${apiUrl}/api/clientes/rfc/${rfc}`;
            console.log('[AI TOOL] Fetching API:', endpoint);
            
            const fetchRes = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
              }
            });
            
            if (!fetchRes.ok) {
              console.error('[AI TOOL] API HTTP Error:', fetchRes.status);
              return { error: `La API de clientes devolvió un error: ${fetchRes.statusText}` };
            }
            
            const data = await fetchRes.json();
            
            if (data && data.data && data.data.length > 0) {
              const cliente = data.data[0];
              if (cliente.STATUS === 'A') {
                const calle = cliente.CALLE || '';
                const num = cliente.NUMEXT || '';
                const col = cliente.COLONIA ? `Col. ${cliente.COLONIA}` : '';
                const cp = cliente.CODIGO ? `C.P. ${cliente.CODIGO}` : '';
                const mun = cliente.MUNICIPIO || '';
                const est = cliente.ESTADO || '';
                const direccion = `${calle} ${num}, ${col}, ${cp}, ${mun}, ${est}`.trim().replace(/,\s*,/g, ',');
                
                // Save fiscal name to cartData instead of overwriting Client name
                if (conversation?.clientId) {
                  const client = await prisma.client.findUnique({ where: { id: conversation.clientId } });
                  const cartData = client.cartData || {};
                  const newCartData = Array.isArray(cartData) 
                    ? { items: cartData, razonSocial: cliente.NOMBRE, rfc: cliente.RFC, billingAddress: direccion } 
                    : { ...cartData, razonSocial: cliente.NOMBRE, rfc: cliente.RFC, billingAddress: direccion };
                  
                  await prisma.client.update({
                    where: { id: conversation.clientId },
                    data: { cartData: newCartData }
                  });
                }
                
                return { status: "success", razon_social: cliente.NOMBRE, rfc: cliente.RFC, direccion };
              } else {
                return { status: "inactive", message: "El cliente existe pero no está activo en el sistema." };
              }
            }
            
            return { status: "not_found", message: "No se encontró el RFC exacto en la base de datos." };
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
            
            await EmailService.sendQuotationEmail(args.email, clientDataForPdf.name, filePath);

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

      const systemInstruction = `You are an AI assistant helping a human sales representative (Vendor) draft a reply to a client. 
Use the following context from our knowledge base (if any) and the conversation history to draft an accurate and helpful response.
Do NOT include [[ESCALATE]] in this context. You must follow the exact instruction provided by the Vendor Prompt.
Draft ONLY the text that the vendor should send to the client. Do not include quotes or commentary.

Context:
${contextString}`;

      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
        formattedHistory.push({ role: 'model', content: '[Esperando asistencia IA...]' });
      }
      formattedHistory.push({ role: 'user', content: `Vendor Prompt: ${userPrompt}` });

      const response = await this.generateResponse(tenantId, formattedHistory, systemInstruction);
      
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
