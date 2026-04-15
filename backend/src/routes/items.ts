import express from 'express';
import itemService from '../services/itemService';
import matchingService from '../services/matchingService';
import prisma from '../utils/database';
import { ItemType, ItemStatus } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/items - Get all items with optional filters
router.get('/', async (req, res, next) => {
  try {
    const {
      type,
      status,
      category,
      location,
      search,
      limit,
      offset,
    } = req.query;

    const filters: any = {};
    if (type) filters.type = type as ItemType;
    if (status) filters.status = status as ItemStatus;
    if (category) filters.category = category as string;
    if (location) filters.location = location as string;
    if (search) filters.search = search as string;
    if (limit) filters.limit = parseInt(limit as string, 10);
    if (offset) filters.offset = parseInt(offset as string, 10);

    const result = await itemService.findAll(filters);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

// GET /api/items/lost - Get all lost items
router.get('/lost', async (req, res, next) => {
  try {
    const items = await itemService.getActiveLostItems();
    res.json({ items, total: items.length });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/items/found - Get all found items
router.get('/found', async (req, res, next) => {
  try {
    const items = await itemService.getActiveFoundItems();
    res.json({ items, total: items.length });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/items/:id - Get item by ID
router.get('/:id', async (req, res, next) => {
  try {
    const item = await itemService.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error: any) {
    next(error);
  }
});

// GET /api/items/me - Get current user's items and claims
router.get('/me', authenticate, async (req: any, res: any, next: any) => {
  try {
    const authReq = req as AuthRequest;
    
    // Fetch items reported by user
    const items = await prisma.item.findMany({
      where: { reporterId: authReq.user!.id },
      include: {
        claims: {
          include: { claimant: { select: { name: true, email: true, phone: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(items);
  } catch (error: any) {
    next(error);
  }
});

// POST /api/items - Create new item (Protected)
router.post('/', authenticate, async (req: any, res: any, next: any) => {
  try {
    const {
      type,
      title,
      description,
      category,
      location,
      latitude,
      longitude,
      imageUrl,
      foundDate,
      lostDate,
      phone,
    } = req.body;

    const authReq = req as AuthRequest;
    const user = authReq.user!;

    // Validation
    if (!type || !['LOST', 'FOUND'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be LOST or FOUND' });
    }
    if (!title || !description || !category || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const item = await itemService.create({
      type: type as ItemType,
      title,
      description,
      category,
      location,
      reporterId: user.id,
      latitude,
      longitude,
      imageUrl,
      foundDate: foundDate ? new Date(foundDate) : undefined,
      lostDate: lostDate ? new Date(lostDate) : undefined,
    });

    // Update user profile with phone number if provided
    if (phone) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone }
      });
    }

    // Reactive matching hook for FOUND items
    if (item.type === 'FOUND') {
      const matchThreshold = 0.7; // 70% confidence required
      const results = await matchingService.findMatchesForFoundItem(item.id, matchThreshold);
      
      for (const result of results) {
        await matchingService.saveMatch(result.lostItem.id, item.id, result.similarityScore);
        
        // Notify the owner of the lost item
        const lostReporter = await prisma.user.findUnique({
          where: { id: result.lostItem.reporterId }
        });
        
        if (lostReporter?.email) {
          await matchingService.sendNotificationEmail(
            lostReporter.email,
            result.lostItem,
            item,
            result.similarityScore
          );
        }
      }
    }

    res.status(201).json(item);
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/items/:id - Update item
router.put('/:id', async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      location,
      latitude,
      longitude,
      imageUrl,
      status,
    } = req.body;

    const item = await itemService.update(req.params.id, {
      title,
      description,
      category,
      location,
      latitude,
      longitude,
      imageUrl,
      status: status as ItemStatus,
    });

    res.json(item);
  } catch (error: any) {
    if (error.message === 'Item not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// DELETE /api/items/:id - Delete item
router.delete('/:id', async (req, res, next) => {
  try {
    await itemService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Item not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// PATCH /api/items/:id/status - Update item status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'PENDING_CLAIM', 'CLAIMED', 'RESOLVED', 'EXPIRED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const item = await itemService.updateStatus(req.params.id, status as ItemStatus);
    res.json(item);
  } catch (error: any) {
    if (error.message === 'Item not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
