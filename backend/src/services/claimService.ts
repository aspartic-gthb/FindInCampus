import prisma from '../utils/database';
import { Claim, ClaimStatus, ItemStatus } from '@prisma/client';

export interface CreateClaimInput {
  itemId: string;
  claimantId: string;
  description: string;
  proofImage?: string;
}

export interface UpdateClaimInput {
  status?: ClaimStatus;
  verificationNotes?: string;
  reviewedBy?: string;
}

export class ClaimService {
  async create(data: CreateClaimInput): Promise<Claim> {
    // Check if item exists and is active
    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    if (item.status !== 'ACTIVE') {
      throw new Error(`Cannot claim item with status: ${item.status}`);
    }

    // Check for existing pending claims
    const existingClaim = await prisma.claim.findFirst({
      where: {
        itemId: data.itemId,
        status: 'PENDING',
        claimantId: data.claimantId,
      },
    });

    if (existingClaim) {
      throw new Error('You already have a pending claim for this item');
    }

    // Update item status to pending claim
    await prisma.item.update({
      where: { id: data.itemId },
      data: { status: 'PENDING_CLAIM' },
    });

    return prisma.claim.create({
      data,
      include: {
        item: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
        claimant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<Claim | null> {
    return prisma.claim.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            status: true,
            category: true,
            location: true,
            imageUrl: true,
          },
        },
        claimant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async findByItem(itemId: string): Promise<Claim[]> {
    return prisma.claim.findMany({
      where: { itemId },
      include: {
        claimant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByClaimant(claimantId: string): Promise<Claim[]> {
    return prisma.claim.findMany({
      where: { claimantId },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            category: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateClaimInput): Promise<Claim> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Claim not found');
    }

    const updated = await prisma.claim.update({
      where: { id },
      data: {
        ...data,
        reviewedAt: data.status ? new Date() : undefined,
      },
      include: {
        item: true,
        claimant: true,
      },
    });

    // Update item status based on claim decision
    if (data.status === 'APPROVED') {
      await prisma.item.update({
        where: { id: updated.itemId },
        data: { status: 'CLAIMED' },
      });
    } else if (data.status === 'REJECTED') {
      // Check if there are other pending claims
      const otherPendingClaims = await prisma.claim.findFirst({
        where: {
          itemId: updated.itemId,
          status: 'PENDING',
        },
      });

      if (!otherPendingClaims) {
        // No other pending claims, set item back to active
        await prisma.item.update({
          where: { id: updated.itemId },
          data: { status: 'ACTIVE' },
        });
      }
    }

    return updated;
  }

  async approveClaim(id: string, reviewedBy: string, verificationNotes?: string): Promise<Claim> {
    return this.update(id, {
      status: 'APPROVED',
      reviewedBy,
      verificationNotes,
    });
  }

  async rejectClaim(id: string, reviewedBy: string, verificationNotes?: string): Promise<Claim> {
    return this.update(id, {
      status: 'REJECTED',
      reviewedBy,
      verificationNotes,
    });
  }

  async getPendingClaims(): Promise<Claim[]> {
    return prisma.claim.findMany({
      where: { status: 'PENDING' },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            type: true,
            category: true,
            location: true,
          },
        },
        claimant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getClaimStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.claim.count(),
      prisma.claim.count({ where: { status: 'PENDING' } }),
      prisma.claim.count({ where: { status: 'APPROVED' } }),
      prisma.claim.count({ where: { status: 'REJECTED' } }),
    ]);

    return { total, pending, approved, rejected };
  }
}

export default new ClaimService();
