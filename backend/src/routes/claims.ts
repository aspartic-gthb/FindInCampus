import express from 'express';
import mongoose from 'mongoose';
import Claim from '../models/Claim';
import Item from '../models/Item';
import Message from '../models/Message';
import User from '../models/User';
import { protect, AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../services/encryption';
import { verifyClaimContext } from '../services/gemini';
import { sameId } from '../utils/ids';

const router = express.Router();

function formatClaim(claim: any) {
  const obj = claim.toObject();
  return {
    ...obj,
    id: claim._id.toString(),
    itemId: claim.itemId?._id?.toString?.() ?? claim.itemId?.toString?.() ?? claim.itemId,
    claimantId: claim.claimantId?._id?.toString?.() ?? claim.claimantId?.toString?.() ?? claim.claimantId,
    reviewedBy: claim.reviewedBy?.toString?.() ?? claim.reviewedBy,
  };
}

async function loadClaimWithItem(claimId: string) {
  if (!mongoose.Types.ObjectId.isValid(claimId)) return null;
  const claim = await Claim.findById(claimId);
  if (!claim) return null;
  const item = await Item.findById(claim.itemId);
  if (!item) return null;
  return { claim, item };
}

function userCanAccessClaim(
  userId: unknown,
  claim: { claimantId: unknown },
  item: { reporterId: unknown }
) {
  return sameId(claim.claimantId, userId) || sameId(item.reporterId, userId);
}

router.post('/', protect, async (req: AuthRequest, res) => {
  try {
    const { itemId, lostLocation, lostTime, route, lastAction, uniqueFeatures } = req.body;

    if (!itemId || !lostLocation?.trim() || !lostTime?.trim() || !uniqueFeatures?.trim()) {
      return res.status(400).json({ message: 'itemId, lostLocation, lostTime, and uniqueFeatures are required' });
    }

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.status !== 'OPEN') {
      return res.status(400).json({ message: 'This item is not open for claims' });
    }

    if (sameId(item.reporterId, req.user._id)) {
      return res.status(400).json({ message: 'You cannot claim an item you reported' });
    }

    const existingClaim = await Claim.findOne({
      itemId: item._id,
      claimantId: req.user._id,
      status: { $in: ['PENDING', 'APPROVED'] },
    });
    if (existingClaim) {
      return res.status(400).json({ message: 'You already have an active claim on this item' });
    }

    const aiResult = await verifyClaimContext(item, {
      lostLocation,
      lostTime,
      route,
      lastAction,
      uniqueFeatures,
    });

    const initialStatus = aiResult.score < 30 ? 'REJECTED' : 'PENDING';

    const claim = await Claim.create({
      itemId,
      claimantId: req.user._id,
      status: initialStatus,
      lostLocation: lostLocation.trim(),
      lostTime: lostTime.trim(),
      route,
      lastAction,
      uniqueFeatures: uniqueFeatures.trim(),
      confidenceScore: aiResult.score,
      aiReasoning: aiResult.reasoning,
    });

    if (initialStatus !== 'REJECTED') {
      await Item.findByIdAndUpdate(itemId, { status: 'PENDING_CLAIM' });
    }

    res.status(201).json(formatClaim(claim));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/item/:itemId', protect, async (req: AuthRequest, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const isReporter = sameId(item.reporterId, req.user._id);
    const filter: Record<string, unknown> = { itemId: req.params.itemId };
    if (!isReporter) {
      filter.claimantId = req.user._id;
    }

    const claims = await Claim.find(filter).populate('claimantId', 'name email trustScore');
    if (!isReporter && claims.length === 0) {
      return res.status(403).json({ message: 'Not authorized to view claims for this item' });
    }

    res.json(claims.map(formatClaim));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/user', protect, async (req: AuthRequest, res) => {
  try {
    const claims = await Claim.find({ claimantId: req.user._id }).populate('itemId');
    res.json(claims.map(formatClaim));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/:id/approve', protect, async (req: AuthRequest, res) => {
  try {
    const loaded = await loadClaimWithItem(req.params.id);
    if (!loaded) return res.status(404).json({ message: 'Claim not found' });

    const { claim, item } = loaded;
    if (!sameId(item.reporterId, req.user._id)) {
      return res.status(403).json({ message: 'Only the item reporter can approve claims' });
    }
    if (claim.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending claims can be approved' });
    }

    const updated = await Claim.findByIdAndUpdate(
      claim._id,
      { status: 'APPROVED', reviewedBy: req.user._id, verificationNotes: req.body.notes },
      { new: true }
    );

    await Claim.updateMany(
      { itemId: claim.itemId, _id: { $ne: claim._id }, status: 'PENDING' },
      { status: 'REJECTED', verificationNotes: 'Another claim was approved for this item.' }
    );

    await Item.findByIdAndUpdate(claim.itemId, { status: 'RESOLVED' });
    await User.findByIdAndUpdate(req.user._id, { $inc: { trustScore: 5 } });
    if (claim.claimantId) {
      await User.findByIdAndUpdate(claim.claimantId, { $inc: { trustScore: 3 } });
    }

    res.json(formatClaim(updated));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/:id/reject', protect, async (req: AuthRequest, res) => {
  try {
    const loaded = await loadClaimWithItem(req.params.id);
    if (!loaded) return res.status(404).json({ message: 'Claim not found' });

    const { claim, item } = loaded;
    if (!sameId(item.reporterId, req.user._id)) {
      return res.status(403).json({ message: 'Only the item reporter can reject claims' });
    }
    if (claim.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending claims can be rejected' });
    }

    const updated = await Claim.findByIdAndUpdate(
      claim._id,
      { status: 'REJECTED', reviewedBy: req.user._id, verificationNotes: req.body.notes },
      { new: true }
    );

    const otherPending = await Claim.findOne({ itemId: claim.itemId, status: 'PENDING' });
    if (!otherPending) {
      await Item.findByIdAndUpdate(claim.itemId, { status: 'OPEN' });
    }

    res.json(formatClaim(updated));
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/:id/messages', protect, async (req: AuthRequest, res) => {
  try {
    const loaded = await loadClaimWithItem(req.params.id);
    if (!loaded) return res.status(404).json({ message: 'Claim not found' });

    const { claim, item } = loaded;
    if (!userCanAccessClaim(req.user._id, claim, item)) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const messages = await Message.find({ claimId: req.params.id }).sort({ createdAt: 1 });
    res.json(
      messages.map((m) => {
        const obj = m.toObject();
        let text = obj.text;
        try {
          text = decrypt(obj.text);
        } catch {
          // keep stored value if decryption fails
        }
        return {
          ...obj,
          text,
          id: m._id.toString(),
          senderId: m.senderId?.toString?.() ?? m.senderId,
          claimId: m.claimId?.toString?.() ?? m.claimId,
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/:id/messages', protect, async (req: AuthRequest, res) => {
  try {
    const text = req.body.text?.trim();
    if (!text) return res.status(400).json({ message: 'Message text is required' });

    const loaded = await loadClaimWithItem(req.params.id);
    if (!loaded) return res.status(404).json({ message: 'Claim not found' });

    const { claim, item } = loaded;
    if (!userCanAccessClaim(req.user._id, claim, item)) {
      return res.status(403).json({ message: 'Not authorized to post in this conversation' });
    }
    if (claim.status === 'REJECTED') {
      return res.status(400).json({ message: 'Cannot message on a rejected claim' });
    }

    const message = await Message.create({
      claimId: req.params.id,
      senderId: req.user._id,
      text: encrypt(text),
    });

    res.status(201).json({
      ...message.toObject(),
      text,
      id: message._id.toString(),
      senderId: message.senderId.toString(),
      claimId: message.claimId.toString(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
