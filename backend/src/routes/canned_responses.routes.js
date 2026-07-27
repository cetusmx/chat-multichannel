const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

// Get all canned responses for the tenant
router.get('/', authenticate, async (req, res, next) => {
  try {
    const responses = await prisma.cannedResponse.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: responses });
  } catch (error) {
    next(error);
  }
});

// Get canned responses ordered by usage for the current vendor
router.get('/my-usage', authenticate, async (req, res, next) => {
  try {
    const responses = await prisma.cannedResponse.findMany({
      where: { tenantId: req.user.tenantId }
    });
    
    const usages = await prisma.cannedResponseUsage.findMany({
      where: { userId: req.user.id }
    });
    
    const usageMap = new Map();
    usages.forEach(u => usageMap.set(u.cannedResponseId, u));

    const sortedResponses = responses.map(r => ({
      ...r,
      lastUsedAt: usageMap.get(r.id)?.lastUsedAt || null,
      useCount: usageMap.get(r.id)?.useCount || 0
    })).sort((a, b) => {
      // Sort by useCount desc, then lastUsedAt desc
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      if (b.lastUsedAt && a.lastUsedAt) return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
      if (b.lastUsedAt) return 1;
      if (a.lastUsedAt) return -1;
      return 0;
    });

    res.json({ data: sortedResponses });
  } catch (error) {
    next(error);
  }
});

// Create a canned response (ADMIN only)
router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { title, content, shortcut } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newResponse = await prisma.cannedResponse.create({
      data: {
        tenantId: req.user.tenantId,
        title,
        content,
        shortcut
      }
    });
    res.status(201).json({ data: newResponse });
  } catch (error) {
    next(error);
  }
});

// Update a canned response
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, shortcut } = req.body;
    
    const existing = await prisma.cannedResponse.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.cannedResponse.update({
      where: { id },
      data: { title, content, shortcut }
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete a canned response
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.cannedResponse.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await prisma.cannedResponse.delete({ where: { id } });
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

// Record usage
router.post('/:id/use', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.cannedResponse.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const usage = await prisma.cannedResponseUsage.upsert({
      where: {
        userId_cannedResponseId: {
          userId: req.user.id,
          cannedResponseId: id
        }
      },
      update: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 }
      },
      create: {
        userId: req.user.id,
        cannedResponseId: id,
        useCount: 1
      }
    });
    
    res.json({ data: usage });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
