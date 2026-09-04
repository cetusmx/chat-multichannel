const searchService = require('../services/search.service');
const { z } = require('zod');

// Schema for request validation
const searchSchema = z.object({
  q: z.string().trim().min(1, 'Search query is required').max(100, 'Search query is too long'),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  vendorId: z.string().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const sanitizeQuery = (query) => {
  // Remove special characters that could break tsquery
  return query.replace(/[^\w\s\u00C0-\u017F]/g, ' ').replace(/\s+/g, ' ').trim();
};

const globalSearch = async (req, res) => {
  try {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { q, type, dateFrom, dateTo, vendorId, page, limit } = parsed.data;
    const sanitizedQ = sanitizeQuery(q);

    if (!sanitizedQ) {
      return res.status(400).json({ error: 'Search query is invalid or empty after sanitization' });
    }

    const offset = (page - 1) * limit;
    const tenantId = req.user.tenantId;

    const result = await searchService.performSearch({
      tenantId,
      query: sanitizedQ,
      type,
      filters: { dateFrom, dateTo, vendorId },
      limit,
      offset,
      page
    });

    res.json(result);
  } catch (error) {
    console.error('Error in globalSearch:', error);
    res.status(500).json({ error: 'Internal server error during search' });
  }
};

module.exports = {
  globalSearch
};
