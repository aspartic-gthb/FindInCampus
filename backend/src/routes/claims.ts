import express from 'express';
import claimService from '../services/claimService';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../utils/database';
import matchingService from '../services/matchingService';

const router = express.Router();

// GET /api/claims/item/:itemId - Get all claims for an item
router.get('/item/:itemId', async (req, res, next) => {
  try {
    const claims = await claimService.findByItem(req.params.itemId);
    res.json(claims);
  } catch (error: any) {
    next(error);
  }
});

// POST /api/claims - Create new claim (Protected)
router.post('/', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { itemId, description, proofImage } = req.body;
    const authReq = req as AuthRequest;

    if (!itemId || !description) {
      return res.status(400).json({ error: 'Missing required fields: itemId, description' });
    }

    const claim = await claimService.create({
      itemId,
      claimantId: authReq.user!.id,
      description,
      proofImage,
    });

    res.status(201).json(claim);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('Cannot claim') || error.message.includes('already have a pending claim')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// POST /api/claims/:id/approve - Approve a claim (Protected)
router.post('/:id/approve', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { verificationNotes } = req.body;
    const authReq = req as AuthRequest;

    const claim = await claimService.approveClaim(req.params.id, authReq.user!.id, verificationNotes);
    
    // Notify claimant with finder's details
    const claimant = await prisma.user.findUnique({ where: { id: claim.claimantId } });
    const item = await prisma.item.findUnique({ 
      where: { id: claim.itemId },
      include: { reporter: true }
    });

    if (claimant && item && item.reporter) {
      await matchingService.sendClaimApprovedEmail(
        claimant.email,
        item.title,
        item.reporter.name || 'Finder',
        item.reporter.email,
        item.reporter.phone
      );
    }

    res.json(claim);
  } catch (error: any) {
    if (error.message === 'Claim not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// POST /api/claims/:id/reject - Reject a claim (Protected)
router.post('/:id/reject', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { verificationNotes } = req.body;
    const authReq = req as AuthRequest;

    const claim = await claimService.rejectClaim(req.params.id, authReq.user!.id, verificationNotes);
    res.json(claim);
  } catch (error: any) {
    if (error.message === 'Claim not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
