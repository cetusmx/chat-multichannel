const express = require('express');
const prisma = require('../config/database');

const router = express.Router();

// GET all rules for tenant
router.get('/', async (req, res) => {
  try {
    const rules = await prisma.aiRule.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { term: 'asc' }
    });
    res.json(rules);
  } catch (error) {
    console.error('Error fetching AiRules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new rule
router.post('/', async (req, res) => {
  const { term, definition, isActive } = req.body;
  try {
    const rule = await prisma.aiRule.create({
      data: {
        tenantId: req.user.tenantId,
        term,
        definition,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.status(201).json(rule);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Term already exists' });
    }
    console.error('Error creating AiRule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update rule
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { term, definition, isActive } = req.body;
  try {
    // Verify it belongs to tenant
    const existing = await prisma.aiRule.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updated = await prisma.aiRule.update({
      where: { id },
      data: { term, definition, isActive }
    });
    res.json(updated);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Term already exists' });
    }
    console.error('Error updating AiRule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE rule
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Verify it belongs to tenant
    const existing = await prisma.aiRule.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    await prisma.aiRule.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting AiRule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
