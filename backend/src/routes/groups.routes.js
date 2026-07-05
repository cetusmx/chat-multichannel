const { Router } = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const groupService = require('../services/group.service');
const { success, created, noContent, list } = require('../utils/response');

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /groups:
 *   get:
 *     tags: [Groups]
 *     summary: List all groups for the tenant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups with vendor count and assigned coordinator
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req, res, next) => {
  try {
    const groups = await groupService.listGroups(req.user.tenantId);
    list(res, groups);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /groups:
 *   post:
 *     tags: [Groups]
 *     summary: Create a new group (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, branchId]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               branchId: { type: string }
 *     responses:
 *       201:
 *         description: Group created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authorize('ADMIN'), async (req, res, next) => {
  try {
    const group = await groupService.createGroup(req.user.tenantId, req.body);
    created(res, group);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /groups/{id}:
 *   put:
 *     tags: [Groups]
 *     summary: Update a group (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               branchId: { type: string }
 *     responses:
 *       200:
 *         description: Group updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Group not found
 */
router.put('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const group = await groupService.updateGroup(req.params.id, req.user.tenantId, req.body);
    success(res, group);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /groups/{id}:
 *   delete:
 *     tags: [Groups]
 *     summary: Delete a group (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Group deleted
 *       400:
 *         description: Cannot delete group with assigned users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Group not found
 */
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    await groupService.deleteGroup(req.params.id, req.user.tenantId);
    noContent(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
