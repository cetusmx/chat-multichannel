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

const generateUsageReportCSV = async (tenantId, year, month) => {
  if (!tenantId) {
    throw ApiError.badRequest('tenantId is required');
  }

  const parsedYear = parseInt(year, 10);
  const parsedMonth = parseInt(month, 10); // 1-12

  if (isNaN(parsedYear) || isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw ApiError.badRequest('Invalid year or month');
  }

  const start = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw ApiError.badRequest('Invalid date constructed');
  }

  const now = new Date();
  if (start > now) {
    throw ApiError.badRequest('Cannot generate report for future dates');
  }

  const rows = await prisma.$queryRaw`
    WITH calendar AS (
      SELECT generate_series(${start}::timestamptz AT TIME ZONE 'UTC', ${end}::timestamptz AT TIME ZONE 'UTC', '1 day'::interval)::date as log_date
    ),
    daily_messages AS (
      SELECT 
        DATE(m.created_at AT TIME ZONE 'UTC') as log_date,
        COUNT(m.id)::int as total_mensajes,
        COUNT(CASE WHEN m.sender_type = 'IA' THEN 1 END)::int as intervenciones_ia
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.tenant_id = ${tenantId}
        AND m.created_at >= ${start}
        AND m.created_at <= ${end}
      GROUP BY DATE(m.created_at AT TIME ZONE 'UTC')
    ),
    daily_sessions AS (
      SELECT 
        DATE(c.created_at AT TIME ZONE 'UTC') as log_date,
        COUNT(c.id)::int as sesiones_activas
      FROM conversations c
      WHERE c.tenant_id = ${tenantId}
        AND c.created_at >= ${start}
        AND c.created_at <= ${end}
      GROUP BY DATE(c.created_at AT TIME ZONE 'UTC')
    )
    SELECT 
      cal.log_date,
      COALESCE(dm.total_mensajes, 0) as total_mensajes,
      COALESCE(dm.intervenciones_ia, 0) as intervenciones_ia,
      COALESCE(ds.sesiones_activas, 0) as sesiones_activas
    FROM calendar cal
    LEFT JOIN daily_messages dm ON cal.log_date = dm.log_date
    LEFT JOIN daily_sessions ds ON cal.log_date = ds.log_date
    ORDER BY cal.log_date ASC
  `;

  const csvRows = ['Fecha,Total Mensajes,Intervenciones IA,Sesiones Activas'];
  
  for (const row of rows) {
    let dateStr = '';
    if (row.log_date) {
      // row.log_date might be a Date object or string depending on driver.
      // If Date object, formatting it nicely in UTC:
      const d = new Date(row.log_date);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${day}`;
    }
    csvRows.push(`${dateStr},${row.total_mensajes},${row.intervenciones_ia},${row.sesiones_activas}`);
  }

  return '\uFEFF' + csvRows.join('\n');
};

module.exports = {
  getVendorProductivityMetrics,
  generateUsageReportCSV
};
