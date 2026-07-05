const { Router } = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const usersService = require('../services/users.service');
const { success, created, list } = require('../utils/response');

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users (paginated, filterable by role)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [ADMIN, COORDINATOR, VENDOR] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', authorize('ADMIN', 'COORDINATOR'), async (req, res, next) => {
  try {
    const result = await usersService.listUsers(req.user.tenantId, req.query, req.user.role);
    list(res, result.users, result.meta);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get('/:id', authorize('ADMIN', 'COORDINATOR'), async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id, req.user.tenantId);
    success(res, user);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               password: { type: string, minLength: 6 }
 *               role: { type: string, enum: [ADMIN, COORDINATOR, VENDOR] }
 *               groupIds: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Email already in use
 */
router.post('/', authorize('ADMIN', 'COORDINATOR'), async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.body, req.user.tenantId, req.user.role);
    created(res, user);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user details
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
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               groupIds: { type: array, items: { type: string }, description: Replaces all group assignments for vendor users }
 *     responses:
 *       200:
 *         description: User updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put('/:id', authorize('ADMIN', 'COORDINATOR'), async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.user.tenantId, req.user.role, req.body);
    success(res, user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
