const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

const performSearch = async ({ tenantId, query, type, filters, limit, offset, page }) => {
  const data = [];
  const facets = { chats: 0, clients: 0, orders: 0 };

  const { dateFrom, dateTo, vendorId, rfc } = filters;
  const skipChats = type && type !== 'chats';
  const skipClients = type && type !== 'clients';

  // Build where conditions dynamically
  let dateFilter = Prisma.sql``;
  if (dateFrom) {
    if (isNaN(Date.parse(dateFrom))) throw new Error('Invalid dateFrom format');
    dateFilter = Prisma.sql`AND m."created_at" >= ${new Date(dateFrom)}`;
  }
  if (dateTo) {
    if (isNaN(Date.parse(dateTo))) throw new Error('Invalid dateTo format');
    dateFilter = Prisma.sql`AND m."created_at" <= ${new Date(dateTo)}`;
  }

  let vendorFilter = Prisma.sql``;
  if (vendorId) vendorFilter = Prisma.sql`AND c."vendor_id" = ${vendorId}`;

  let rfcFilter = Prisma.sql``;
  if (rfc) {
    rfcFilter = Prisma.sql`AND cl."cart_data"::text ILIKE ${'%"rfc":"' + rfc + '"%'}`;
  }

  // 1. CHATS (Messages)
  let chatsCount = 0;
  if (!skipChats) {
    const chatsCountQuery = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT c.id) as cnt
      FROM "messages" m
      JOIN "conversations" c ON m."conversation_id" = c.id
      JOIN "clients" cl ON c."client_id" = cl.id
      WHERE c."tenant_id" = ${tenantId}
      AND to_tsvector('spanish', COALESCE(m.content, '')) @@ websearch_to_tsquery('spanish', ${query})
      ${dateFilter}
      ${vendorFilter}
      ${rfcFilter}
    `;
    chatsCount = Number(chatsCountQuery[0]?.cnt || 0);
    facets.chats = chatsCount;

    // Dynamic Facets for Vendors
    const vendorFacetsQuery = await prisma.$queryRaw`
      SELECT 
        u.id, 
        u.name, 
        COUNT(DISTINCT c.id) as count
      FROM "messages" m
      JOIN "conversations" c ON m."conversation_id" = c.id
      JOIN "clients" cl ON c."client_id" = cl.id
      JOIN "users" u ON c."vendor_id" = u.id
      WHERE c."tenant_id" = ${tenantId}
      AND c."vendor_id" IS NOT NULL
      AND to_tsvector('spanish', COALESCE(m.content, '')) @@ websearch_to_tsquery('spanish', ${query})
      ${dateFilter}
      ${rfcFilter}
      GROUP BY u.id, u.name
      ORDER BY count DESC
    `;
    facets.asesores = vendorFacetsQuery.map(v => ({ id: v.id, name: v.name, count: Number(v.count) }));

    // Dynamic Facets for Clients (and safe RFC extraction)
    const clientFacetsQuery = await prisma.$queryRaw`
      SELECT 
        cl.id, 
        cl.name, 
        cl."phone_number" as phone,
        cl."cart_data"::text as cart_data_text,
        COUNT(DISTINCT c.id) as count
      FROM "messages" m
      JOIN "conversations" c ON m."conversation_id" = c.id
      JOIN "clients" cl ON c."client_id" = cl.id
      WHERE c."tenant_id" = ${tenantId}
      AND to_tsvector('spanish', COALESCE(m.content, '')) @@ websearch_to_tsquery('spanish', ${query})
      ${dateFilter}
      ${vendorFilter}
      ${rfcFilter}
      GROUP BY cl.id, cl.name, cl."phone_number", cl."cart_data"::text
      ORDER BY count DESC
    `;
    
    const rfcsMap = new Map();
    facets.clientes = clientFacetsQuery.map(c => {
      // Safe parsing of cartData to avoid crashes
      let cart = [];
      try {
        if (c.cart_data_text) {
          const parsed = JSON.parse(c.cart_data_text);
          if (Array.isArray(parsed)) cart = parsed;
          else if (typeof parsed === 'object' && parsed !== null) cart = [parsed];
        }
      } catch (e) {
        // Ignore JSON parse errors for malformed cart_data
      }

      // Extract any RFCs found
      cart.forEach(item => {
        if (item && item.rfc) {
          const rfcVal = String(item.rfc).trim();
          if (rfcVal) {
            rfcsMap.set(rfcVal, (rfcsMap.get(rfcVal) || 0) + Number(c.count));
          }
        }
      });

      return { id: c.id, name: c.name || c.phone, count: Number(c.count) };
    });

    facets.rfcs = Array.from(rfcsMap.entries())
      .map(([rfc, count]) => ({ id: rfc, name: rfc, count }))
      .sort((a, b) => b.count - a.count);

    if (chatsCount > 0 && offset < chatsCount) {
      const chatLimit = Math.min(limit, chatsCount - offset);
      
      const messages = await prisma.$queryRaw`
        WITH matched_messages AS (
          SELECT DISTINCT ON (c.id)
            m.id, 
            m."conversation_id", 
            m.content, 
            m."created_at",
            c."client_id",
            cl.name as "client_name",
            cl."phone_number"
          FROM "messages" m
          JOIN "conversations" c ON m."conversation_id" = c.id
          JOIN "clients" cl ON c."client_id" = cl.id
          WHERE c."tenant_id" = ${tenantId}
          AND to_tsvector('spanish', COALESCE(m.content, '')) @@ websearch_to_tsquery('spanish', ${query})
          ${dateFilter}
          ${vendorFilter}
          ${rfcFilter}
          ORDER BY c.id, m."created_at" ASC
        ),
        paginated_messages AS (
          SELECT *,
            ts_headline('spanish', COALESCE(content, ''), websearch_to_tsquery('spanish', ${query}), 'StartSel=<b>, 
StopSel=</b>, MaxWords=20, MinWords=5') as snippet
          FROM matched_messages
          ORDER BY "created_at" DESC
          LIMIT ${chatLimit} OFFSET ${offset}
        )
        SELECT 
          pm.*,
          (
            SELECT p.content 
            FROM "messages" p 
            WHERE p."conversation_id" = pm."conversation_id" 
              AND p."created_at" < pm."created_at" 
            ORDER BY p."created_at" DESC 
            LIMIT 1
          ) as "previousMessageContext"
        FROM paginated_messages pm
      `;

      for (const msg of messages) {
        data.push({
          type: 'chat',
          id: msg.id,
          conversationId: msg.conversation_id,
          clientId: msg.client_id,
          clientName: msg.client_name || msg.phone_number,
          createdAt: msg.created_at,
          snippet: msg.snippet || msg.content,
          previousMessageContext: msg.previousMessageContext || null
        });
      }
    }
  }

  // 2. CLIENTS
  if (!skipClients) {
    const escapedQuery = query.replace(/[%_]/g, '\\$&');
    
    const clientsCountQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as cnt
      FROM "clients"
      WHERE "tenant_id" = ${tenantId}
      AND (
        "phone_number" ILIKE ${'%' + escapedQuery + '%'}
        OR "name" ILIKE ${'%' + escapedQuery + '%'}
      )
    `;
    const clientsCount = Number(clientsCountQuery[0]?.cnt || 0);
    facets.clients = clientsCount;

    const remainingLimit = limit - data.length;
    // Calculate client offset taking into account chats that might have been skipped
    const clientOffset = Math.max(0, offset - chatsCount);

    if (clientsCount > 0 && remainingLimit > 0 && clientOffset < clientsCount) {
      const clients = await prisma.$queryRaw`
        SELECT id, name, "phone_number" as "phoneNumber", "created_at" as "createdAt"
        FROM "clients"
        WHERE "tenant_id" = ${tenantId}
        AND (
          "phone_number" ILIKE ${'%' + escapedQuery + '%'}
          OR "name" ILIKE ${'%' + escapedQuery + '%'}
        )
        ORDER BY "created_at" DESC
        LIMIT ${remainingLimit} OFFSET ${clientOffset}
      `;

      for (const c of clients) {
        data.push({
          type: 'client',
          id: c.id,
          name: c.name,
          phone: c.phoneNumber,
          createdAt: c.createdAt,
          snippet: c.name || c.phoneNumber
        });
      }
    }
  }

  data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let totalRequestedCount = 0;
  if (!skipChats) totalRequestedCount += facets.chats;
  if (!skipClients) totalRequestedCount += facets.clients;
  
  const hasMore = (offset + limit) < totalRequestedCount;

  return {
    data,
    meta: {
      pagination: {
        page,
        limit,
        offset,
        hasMore
      },
      facets
    }
  };
};

module.exports = {
  performSearch
};
