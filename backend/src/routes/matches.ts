import express from 'express';
import matchingService, { prisma } from '../services/matchingService';

const router = express.Router();

// GET /api/matches - Get all unprocessed matches
router.get('/', async (req, res, next) => {
  try {
    const matches = await matchingService.getUnprocessedMatches();
    res.json(matches);
  } catch (error: any) {
    next(error);
  }
});

// GET /api/matches/lost/:id - Find matches for a lost item
router.get('/lost/:id', async (req, res, next) => {
  try {
    const { threshold } = req.query;
    const results = await matchingService.findMatchesForLostItem(
      req.params.id,
      threshold ? parseFloat(threshold as string) : 0.4
    );
    res.json(results);
  } catch (error: any) {
    next(error);
  }
});

// GET /api/matches/found/:id - Find matches for a found item
router.get('/found/:id', async (req, res, next) => {
  try {
    const { threshold } = req.query;
    const results = await matchingService.findMatchesForFoundItem(
      req.params.id,
      threshold ? parseFloat(threshold as string) : 0.4
    );
    res.json(results);
  } catch (error: any) {
    next(error);
  }
});

// POST /api/matches/run - Run matching algorithm
router.post('/run', async (req, res, next) => {
  try {
    const { threshold } = req.body;
    const matchCount = await matchingService.runMatchingAlgorithm(
      threshold ? parseFloat(threshold) : 0.4
    );
    res.json({
      message: `Matching algorithm completed`,
      matchesFound: matchCount,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/matches/:id/process - Mark a match as processed
router.post('/:id/process', async (req, res, next) => {
  try {
    const match = await matchingService.markMatchAsProcessed(req.params.id);
    res.json(match);
  } catch (error: any) {
    if (error.message === 'Match not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// POST /api/matches/calculate - Calculate similarity between two items (preview)
router.post('/calculate', async (req, res, next) => {
  try {
    const { lostItemId, foundItemId } = req.body;

    if (!lostItemId || !foundItemId) {
      return res.status(400).json({ error: 'Both lostItemId and foundItemId are required' });
    }

    // Fetch both items
    const lostItem = await prisma.item.findUnique({
      where: { id: lostItemId },
    });
    const foundItem = await prisma.item.findUnique({
      where: { id: foundItemId },
    });

    if (!lostItem || !foundItem) {
      return res.status(404).json({ error: 'One or both items not found' });
    }

    if (lostItem.type !== 'LOST' || foundItem.type !== 'FOUND') {
      return res.status(400).json({ error: 'Invalid item types' });
    }

    const { score, reasons } = matchingService.calculateSimilarity(lostItem, foundItem);
    res.json({
      lostItemId: lostItem.id,
      foundItemId: foundItem.id,
      similarityScore: score,
      matchReasons: reasons,
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
