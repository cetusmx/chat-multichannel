const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Get vendor productivity metrics
 * @param {string} tenantId 
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @returns {Promise<Array>}
 */
const getVendorProductivityMetrics = async (tenantId, startDate, endDate) => {
  if (!tenantId) {
    throw ApiError.badRequest('tenantId is required');
  }

  if (!startDate || !endDate) {
    throw ApiError.badRequest('startDate and endDate are required');
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw ApiError.badRequest('Invalid startDate or endDate format');
  }

  if (typeof startDate === 'string' && startDate.length === 10) {
    start.setUTCHours(0, 0, 0, 0);
  }
  if (typeof endDate === 'string' && endDate.length === 10) {
    end.setUTCHours(23, 59, 59, 999);
  }

  // 1. One efficient raw SQL query to get all metrics
  const metricsData = await prisma.$queryRaw`
    WITH filtered_conversations AS (
      SELECT id as conversation_id, vendor_id, status, updated_at
      FROM conversations
      WHERE tenant_id = ${tenantId} 
        AND created_at >= ${start} AND created_at <= ${end}
      UNION
      SELECT c.id as conversation_id, c.vendor_id, c.status, c.updated_at
      FROM conversations c
      WHERE c.tenant_id = ${tenantId}
        AND c.created_at < ${start}
        AND EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.conversation_id = c.id 
            AND m.created_at >= ${start} 
            AND m.created_at <= ${end}
        )
    ),
    tenant_vendors AS (
      SELECT id as vendor_id, name, email
      FROM users
      WHERE tenant_id = ${tenantId} AND (role = 'VENDOR' OR id IN (SELECT vendor_id FROM filtered_conversations))
    ),
    client_initiated AS (
      SELECT m.conversation_id, MIN(m.created_at) as first_msg_time
      FROM messages m
      JOIN filtered_conversations fc ON m.conversation_id = fc.conversation_id
      WHERE m.sender_type = 'CLIENT'
      GROUP BY m.conversation_id
    ),
    vendor_first_reply AS (
      SELECT DISTINCT ON (ci.conversation_id)
        ci.conversation_id, 
        m.sender_id,
        EXTRACT(EPOCH FROM (m.created_at - ci.first_msg_time)) as response_delta
      FROM client_initiated ci
      JOIN messages m ON ci.conversation_id = m.conversation_id
      WHERE m.sender_type = 'VENDOR' AND m.created_at > ci.first_msg_time
      ORDER BY ci.conversation_id, m.created_at ASC
    ),
    response_times AS (
      SELECT 
        sender_id as vendor_id,
        AVG(response_delta) as avg_response_time
      FROM vendor_first_reply
      GROUP BY sender_id
    ),
    total_handled AS (
      SELECT vendor_id, COUNT(conversation_id)::int as total_chats
      FROM filtered_conversations
      WHERE vendor_id IS NOT NULL
      GROUP BY vendor_id
    ),
    closed_handled AS (
      SELECT vendor_id, COUNT(conversation_id)::int as closed_chats
      FROM filtered_conversations
      WHERE status = 'CLOSED' AND vendor_id IS NOT NULL
      GROUP BY vendor_id
    )
    SELECT 
      tv.vendor_id as "vendorId",
      tv.name,
      tv.email,
      COALESCE(th.total_chats, 0) as "totalChatsHandled",
      COALESCE(ch.closed_chats, 0) as "closedChats",
      rt.avg_response_time as "avgResponseTime"
    FROM tenant_vendors tv
    LEFT JOIN total_handled th ON tv.vendor_id = th.vendor_id
    LEFT JOIN closed_handled ch ON tv.vendor_id = ch.vendor_id
    LEFT JOIN response_times rt ON tv.vendor_id = rt.vendor_id
  `;

  // 3. Format the result
  return metricsData.map(item => {
    const totalChats = Number(item.totalChatsHandled || 0);
    const closedChats = Number(item.closedChats || 0);
    const avgResponseTime = item.avgResponseTime;
    
    return {
      vendorId: item.vendorId,
      name: item.name || 'Unknown',
      email: item.email || '',
      totalChatsHandled: totalChats,
      resolutionRate: totalChats > 0 ? (closedChats / totalChats) : 0,
      averageResponseTime: (avgResponseTime !== null && avgResponseTime !== undefined) ? Number(avgResponseTime) : null
    };
  });
};

module.exports = {
  getVendorProductivityMetrics
};
