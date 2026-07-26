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
      if (msg.senderType !== 'CLIENT' && msg.senderType !== 'VENDOR') {
        content = `[${msg.senderType}] ${content}`;
      }
      return {
        role: msg.senderType === 'CLIENT' ? 'user' : 'model',
        content
      };
    }).reverse();

    formatted = formatted.reduce((acc, curr) => {
      if (acc.length > 0 && acc[acc.length - 1].role === curr.role) {
        acc[acc.length - 1].content += '\n' + curr.content;
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
          content: { not: '' }
        },
        orderBy: { createdAt: 'desc' },
        take: 40
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

      // Fetch active vendors dynamically
      const activeVendorsList = await prisma.user.findMany({
        where: { tenantId, role: 'VENDOR', isActive: true },
        select: { name: true }
      });
      const vendorNames = activeVendorsList.map(v => v.name).join(', ') || 'Ninguno disponible';

      const dynamicContext = `
[DATOS EN TIEMPO REAL DEL SISTEMA]
- ¿Fuera de horario laboral?: ${isOffHours ? 'SÍ (Estamos cerrados)' : 'NO (Estamos abiertos)'}
- Equipo de vendedores: ${vendorNames}
- CARRITO DE COMPRAS DEL CLIENTE: ${JSON.stringify(clientCart)}
- Instrucción de Carrito: Este es el estado persistente del carrito. Usa la herramienta 'actualizar_carrito' para modificarlo si el cliente pide agregar o quitar algo.
- Instrucción dinámica: Si el cliente pregunta por un vendedor específico que esté en el equipo, indícale si estamos dentro o fuera de horario e incluye [[ESCALATE]] para asignarle el chat a esa persona.
[FIN DE DATOS]
`;

      const aiRules = `
[REGLAS ESTRICTAS DE COMPORTAMIENTO]
1. NUNCA inventes familias de productos. Si el cliente menciona una familia ambigua o que no existe en tu contexto, DETENTE y pídele que aclare dándole ejemplos.
2. Si menciona una unidad (ej. "50 mm") y luego da otras medidas sin unidad, asume SIEMPRE que comparten la misma unidad (mm).
3. FRACCIONES Y PULGADAS: Si el cliente proporciona una medida en fracciones (ej. "1 5/16" o "3/4"), asume INMEDIATAMENTE que se trata del sistema "std" (pulgadas).
4. CONVERSIÓN A DECIMAL: Antes de consultar el catálogo con una fracción, DEBES convertir matemáticamente la fracción a decimales en milésimas. Ejemplo: "1 5/16" debes enviarlo como "1.312" (o 1.3125) en el JSON de consulta.
5. Asegúrate de mapear los parámetros de catálogo tal y como los espera la API.
6. EXISTENCIAS: La API te devuelve el inventario desglosado por sucursal. TU DEBES SUMARLO y decirle al cliente ÚNICAMENTE el TOTAL GLOBAL disponible. No le menciones las sucursales, somos tienda en línea.
7. SIN STOCK: Aunque el producto tenga existencia 0, SIEMPRE ofrécele la información y bríndale el precio.
8. SIN PRECIO: Si un producto tiene precio $0 o nulo, NO le muestres el precio. Simplemente dile que "más tarde un asesor lo contactará para proporcionarle el precio exacto" y ofrécele seguir buscando más productos.
9. PEDIDOS Y CARRITO: Tu rol incluye TOMAR EL PEDIDO. Ve recordando internamente qué productos y cantidades confirma el cliente. SIEMPRE usa la herramienta 'actualizar_carrito' para guardar este estado.
10. FORMATO DE RESULTADOS: Cuando muestres productos de una búsqueda, NO satures el chat. Muestra ÚNICAMENTE la clave del artículo, la descripción breve, el precio (solo si es mayor a 0) y el total global de existencias.
11. COTIZACIONES Y RFC: Si el cliente solicita explícitamente una cotización formal, primero pregúntale su RFC. Si responde que no tiene, asume que es un cliente genérico (Mostrador). Si proporciona un RFC, usa la herramienta 'consultar_cliente_rfc'. Si el resultado es 'success', CONFÍRMALE AL CLIENTE que encontraste sus datos (menciónale su Razón Social / NOMBRE) y dile que con esos datos se elaborará la cotización. Si la herramienta responde 'not_found' o 'inactive', infórmale que no se encontró un cliente activo con ese RFC y trátalo como cliente genérico.
`;

      let baseSystemInstruction = '';
      if (!contextString) {
        baseSystemInstruction = `Eres un asistente de ventas de esta empresa. Actualmente no tienes documentos en tu base de conocimientos. Sé amable, responde de forma general y DEBES incluir la cadena exacta [[ESCALATE]] en cualquier parte de tu respuesta para que un humano tome el chat.\n${dynamicContext}`;
      } else {
        baseSystemInstruction = `Eres un asistente de ventas de esta empresa. Usa ÚNICAMENTE el siguiente contexto de la base de conocimientos para responder. Si el cliente pide explícitamente hablar con un humano, pregunta por un vendedor específico, o si no sabes la respuesta basada en el contexto, DEBES incluir la cadena exacta [[ESCALATE]] en cualquier parte de tu respuesta.\n${aiRules}\n\nContexto:\n${contextString}\n${dynamicContext}`;
      }

      if (isOffHours) {
        baseSystemInstruction += `\nAl estar fuera de horario laboral, preséntate brevemente como Inteligencia Artificial, resuelve la duda si puedes usar el Contexto, infórmale que los humanos regresarán al siguiente día hábil e incluye siempre [[ESCALATE]].`;
      }

      // ----------------------------------------------------
      // DEFINICIÓN DE HERRAMIENTAS GENÉRICAS (AGNOSTICAS)
      // ----------------------------------------------------
      const tools = [{
        functionDeclarations: [
          {
            name: "consultar_catalogo",
            description: "Busca productos en el catálogo. Extrae los parámetros de búsqueda en JSON. REGLA DE ORO: NO inventes la clave 'familia'. Si es ambigua, NO uses la herramienta y pregúntale al usuario. Si menciona una unidad (ej. mm), asume la misma para las demás medidas (sist_med).",
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
            description: "Actualiza el estado persistente del carrito de compras del cliente. Úsala CADA VEZ que el cliente confirme que quiere agregar un producto o modificar cantidades. Envía el array COMPLETO de productos que deben quedar en el carrito.",
            parameters: {
              type: "OBJECT",
              properties: {
                cart_items: {
                  type: "STRING",
                  description: "Un string JSON que representa un array de objetos con los productos del pedido actual. Ejemplo: '[{\"clave\": \"OR-050\", \"descripcion\": \"Oring 50mm\", \"cantidad\": 2, \"precio_unitario\": 150}]'"
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
            const parsedCart = JSON.parse(args.cart_items);
            if (conversation?.clientId) {
              await prisma.client.update({
                where: { id: conversation.clientId },
                data: { cartData: parsedCart }
              });
              return { status: "success", message: "Carrito guardado exitosamente en la base de datos.", cart: parsedCart };
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
                return { status: "success", cliente };
              } else {
                return { status: "inactive", message: "El cliente existe pero no está activo en el sistema." };
              }
            }
            
            return { status: "not_found", message: "No se encontró el RFC exacto en la base de datos." };
          } catch (e) {
            console.error('[AI TOOL] Excepción en consultar_cliente_rfc:', e.message);
            return { error: `Error al consultar el RFC: ${e.message}` };
          }
        }
      };

      const response = await this.generateResponse(tenantId, formattedHistory, baseSystemInstruction, tools, toolHandlers);
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
      const history = await prisma.message.findMany({
        where: { 
          conversationId,
          senderType: { in: ['CLIENT', 'IA', 'VENDOR'] },
          content: { not: '' }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
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
      return response.content;
    } catch (error) {
      console.error('[AI_SERVICE] Error generating inline suggestion:', error.message);
      throw error;
    }
  }

}

module.exports = new AIService();
