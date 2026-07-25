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
        take: 10
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
- Instrucción dinámica: Si el cliente pregunta por un vendedor específico que esté en el equipo, indícale si estamos dentro o fuera de horario e incluye [[ESCALATE]] para asignarle el chat a esa persona.
[FIN DE DATOS]
`;

      let baseSystemInstruction = '';
      if (!contextString) {
        baseSystemInstruction = `Eres un asistente de ventas de esta empresa. Actualmente no tienes documentos en tu base de conocimientos. Sé amable, responde de forma general y DEBES incluir la cadena exacta [[ESCALATE]] en cualquier parte de tu respuesta para que un humano tome el chat.\n${dynamicContext}`;
      } else {
        baseSystemInstruction = `Eres un asistente de ventas de esta empresa. Usa ÚNICAMENTE el siguiente contexto de la base de conocimientos para responder. Si el cliente pide explícitamente hablar con un humano, pregunta por un vendedor específico, o si no sabes la respuesta basada en el contexto, DEBES incluir la cadena exacta [[ESCALATE]] en cualquier parte de tu respuesta.\n\nContexto:\n${contextString}\n${dynamicContext}`;
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
            description: "Busca productos en el catálogo externo de la empresa. Extrae los parámetros de búsqueda que el cliente mencionó y pásalos en formato JSON. Consulta la regla 'Búsqueda de Productos' en tu contexto para saber exactamente qué campos JSON están permitidos para esta empresa. NUNCA inventes campos que no estén en tu contexto.",
            parameters: {
              type: "OBJECT",
              properties: {
                query_params: {
                  type: "STRING",
                  description: "Un string en formato JSON válido con las claves y valores a buscar. Ejemplo: '{\"familia\": \"LLANTAS\", \"diam_int\": 16}'"
                }
              },
              required: ["query_params"]
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
            
            if (data && data.data && Array.isArray(data.data)) {
               // Limitar los resultados a 5 para no reventar la memoria de contexto de Gemini
               return { 
                 resultados: data.data.slice(0, 5), 
                 total_encontrados: data.pagination?.totalRecords || data.data.length,
                 nota: "Se están mostrando máximo 5 resultados. Si hay más, pide al cliente que sea más específico." 
               };
            }
            return data;
          } catch (e) {
            console.error('[AI TOOL] Excepción:', e.message);
            return { error: `Hubo un fallo al leer los parámetros o conectar con el catálogo: ${e.message}` };
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
