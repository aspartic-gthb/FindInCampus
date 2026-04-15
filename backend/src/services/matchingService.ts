import prisma from '../utils/database';
import { Item, Match, PrismaClient } from '@prisma/client';

export { prisma };

export interface MatchResult {
  lostItem: Item;
  foundItem: Item;
  similarityScore: number;
  matchReasons: string[];
}

export class MatchingService {
  /**
   * Calculate text similarity using a simplified cosine similarity approach
   * Compares token overlap between two texts
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const tokenize = (text: string): Set<string> => {
      return new Set(
        text
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 2)
      );
    };

    const tokens1 = tokenize(text1);
    const tokens2 = tokenize(text2);

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    // Calculate intersection
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));

    // Jaccard similarity
    const union = new Set([...tokens1, ...tokens2]);
    return intersection.size / union.size;
  }

  /**
   * Calculate location similarity based on string matching and coordinates
   */
  private calculateLocationSimilarity(
    loc1: string,
    loc2: string,
    coords1?: { lat?: number | null; lng?: number | null },
    coords2?: { lat?: number | null; lng?: number | null }
  ): number {
    let score = 0;

    // String matching (building/area name)
    const loc1Lower = loc1.toLowerCase();
    const loc2Lower = loc2.toLowerCase();

    if (loc1Lower === loc2Lower) {
      score = 1.0;
    } else if (loc1Lower.includes(loc2Lower) || loc2Lower.includes(loc1Lower)) {
      score = 0.7;
    } else if (loc1Lower.split(' ')[0] === loc2Lower.split(' ')[0]) {
      score = 0.5;
    }

    // Coordinate-based matching (if available)
    if (coords1?.lat && coords1?.lng && coords2?.lat && coords2?.lng) {
      const distance = this.calculateDistance(
        coords1.lat,
        coords1.lng,
        coords2.lat,
        coords2.lng
      );

      // Within 100m = perfect match, 500m = 0.5, >1km = 0
      if (distance < 0.1) {
        score = Math.max(score, 1.0);
      } else if (distance < 0.5) {
        score = Math.max(score, 0.7);
      } else if (distance < 1) {
        score = Math.max(score, 0.4);
      }
    }

    return score;
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate category similarity
   */
  private calculateCategorySimilarity(cat1: string, cat2: string): number {
    if (cat1.toLowerCase() === cat2.toLowerCase()) {
      return 1.0;
    }

    // Parent category matching (e.g., "electronics-phone" matches "electronics")
    const cat1Parts = cat1.toLowerCase().split('-');
    const cat2Parts = cat2.toLowerCase().split('-');

    if (cat1Parts[0] === cat2Parts[0]) {
      return 0.6;
    }

    return 0;
  }

  /**
   * Calculate date proximity similarity
   */
  private calculateDateSimilarity(date1?: Date | null, date2?: Date | null): number {
    if (!date1 || !date2) return 0.3; // Neutral score if dates unknown

    const diffMs = Math.abs(new Date(date1).getTime() - new Date(date2).getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return 1.0;
    if (diffDays <= 1) return 0.8;
    if (diffDays <= 3) return 0.6;
    if (diffDays <= 7) return 0.4;
    if (diffDays <= 14) return 0.2;
    return 0.1;
  }

  /**
   * Calculate overall similarity score between a lost and found item
   */
  calculateSimilarity(lostItem: Item, foundItem: Item): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let totalScore = 0;
    let weightSum = 0;

    // Description similarity (highest weight)
    const descSimilarity = this.calculateTextSimilarity(
      `${lostItem.title} ${lostItem.description}`,
      `${foundItem.title} ${foundItem.description}`
    );
    totalScore += descSimilarity * 4;
    weightSum += 4;
    if (descSimilarity > 0.3) {
      reasons.push(`Description match: ${Math.round(descSimilarity * 100)}%`);
    }

    // Category similarity
    const catSimilarity = this.calculateCategorySimilarity(
      lostItem.category,
      foundItem.category
    );
    totalScore += catSimilarity * 3;
    weightSum += 3;
    if (catSimilarity > 0) {
      reasons.push(`Category match: ${lostItem.category}`);
    }

    // Location similarity
    const locSimilarity = this.calculateLocationSimilarity(
      lostItem.location,
      foundItem.location,
      { lat: lostItem.latitude, lng: lostItem.longitude },
      { lat: foundItem.latitude, lng: foundItem.longitude }
    );
    totalScore += locSimilarity * 3;
    weightSum += 3;
    if (locSimilarity > 0.3) {
      reasons.push(`Location match: ${foundItem.location}`);
    }

    // Date proximity
    const dateSimilarity = this.calculateDateSimilarity(
      lostItem.lostDate,
      foundItem.foundDate
    );
    totalScore += dateSimilarity * 2;
    weightSum += 2;
    if (dateSimilarity > 0.5) {
      reasons.push('Date proximity match');
    }

    const finalScore = totalScore / weightSum;

    return {
      score: Math.round(finalScore * 100) / 100,
      reasons,
    };
  }

  /**
   * Find potential matches for a specific lost item
   */
  async findMatchesForLostItem(lostItemId: string, threshold: number = 0.4): Promise<MatchResult[]> {
    const lostItem = await prisma.item.findUnique({
      where: { id: lostItemId },
    });

    if (!lostItem || lostItem.type !== 'LOST') {
      return [];
    }

    // Get all active found items
    const foundItems = await prisma.item.findMany({
      where: {
        type: 'FOUND',
        status: 'ACTIVE',
      },
    });

    const results: MatchResult[] = [];

    for (const foundItem of foundItems) {
      const { score, reasons } = this.calculateSimilarity(lostItem, foundItem);

      if (score >= threshold) {
        results.push({
          lostItem,
          foundItem,
          similarityScore: score,
          matchReasons: reasons,
        });
      }
    }

    // Sort by similarity score descending
    return results.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Find potential matches for a specific found item
   */
  async findMatchesForFoundItem(foundItemId: string, threshold: number = 0.4): Promise<MatchResult[]> {
    const foundItem = await prisma.item.findUnique({
      where: { id: foundItemId },
    });

    if (!foundItem || foundItem.type !== 'FOUND') {
      return [];
    }

    // Get all active lost items
    const lostItems = await prisma.item.findMany({
      where: {
        type: 'LOST',
        status: 'ACTIVE',
      },
    });

    const results: MatchResult[] = [];

    for (const lostItem of lostItems) {
      const { score, reasons } = this.calculateSimilarity(lostItem, foundItem);

      if (score >= threshold) {
        results.push({
          lostItem,
          foundItem,
          similarityScore: score,
          matchReasons: reasons,
        });
      }
    }

    // Sort by similarity score descending
    return results.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Save a match to the database
   */
  async saveMatch(lostItemId: string, foundItemId: string, similarityScore: number): Promise<Match> {
    return prisma.match.upsert({
      where: {
        lostItemId_foundItemId: {
          lostItemId,
          foundItemId,
        },
      },
      update: {
        similarityScore,
      },
      create: {
        lostItemId,
        foundItemId,
        similarityScore,
      },
    });
  }

  /**
   * Get all unprocessed matches
   */
  async getUnprocessedMatches(): Promise<Match[]> {
    return prisma.match.findMany({
      where: {
        isProcessed: false,
      },
      include: {
        lostItem: {
          select: {
            id: true,
            title: true,
            category: true,
            location: true,
          },
        },
        foundItem: {
          select: {
            id: true,
            title: true,
            category: true,
            location: true,
          },
        },
      },
    });
  }

  /**
   * Mark a match as processed
   */
  async markMatchAsProcessed(matchId: string): Promise<Match> {
    return prisma.match.update({
      where: { id: matchId },
      data: { isProcessed: true },
    });
  }

  /**
   * Run matching algorithm for all active lost items
   */
  async runMatchingAlgorithm(threshold: number = 0.4): Promise<number> {
    const lostItems = await prisma.item.findMany({
      where: {
        type: 'LOST',
        status: 'ACTIVE',
      },
    });

    let matchCount = 0;

    for (const lostItem of lostItems) {
      const results = await this.findMatchesForLostItem(lostItem.id, threshold);

      for (const result of results) {
        await this.saveMatch(lostItem.id, result.foundItem.id, result.similarityScore);
        matchCount++;
      }
    }

    return matchCount;
  }

  /**
   * Simulate sending an email notification to the owner
   */
  async sendNotificationEmail(
    email: string,
    lostItem: Item,
    foundItem: Item,
    similarityScore: number
  ): Promise<void> {
    console.log('\n======================================================');
    console.log('✉️  [NOTIFICATION ENGINES] AI MATCH DETECTED!');
    console.log(`=> To: ${email}`);
    console.log(`=> Subject: Great News! We may have found your ${lostItem.title}`);
    console.log('------------------------------------------------------');
    console.log(`Hello,`);
    console.log(`Our AI match engine has flagged a ${Math.round(similarityScore * 100)}% match for your lost item.`);
    console.log(`\nYour Report: ${lostItem.title} in ${lostItem.category}`);
    console.log(`Found Item: ${foundItem.title} found at ${foundItem.location}`);
    console.log(`\nPlease log in to the portal to review this match and claim your item.`);
    console.log('======================================================\n');
  }

  /**
   * Simulate sending an email notification to the claimant when their claim is approved
   */
  async sendClaimApprovedEmail(
    claimantEmail: string,
    itemName: string,
    finderName: string,
    finderEmail: string,
    finderPhone?: string | null
  ): Promise<void> {
    console.log('\n======================================================');
    console.log('✅  [NOTIFICATION ENGINES] CLAIM APPROVED!');
    console.log(`=> To: ${claimantEmail}`);
    console.log(`=> Subject: Your claim for "${itemName}" has been APPROVED!`);
    console.log('------------------------------------------------------');
    console.log(`Hello,`);
    console.log(`The finder has reviewed your proof of ownership and approved your claim.`);
    console.log(`\nHere are the contact details to arrange a meeting and get your item back:`);
    console.log(`Finder Name: ${finderName}`);
    console.log(`Finder Email: ${finderEmail}`);
    if (finderPhone) {
      console.log(`Finder Phone: ${finderPhone}`);
    }
    console.log(`\nThank you for using Lost n Found!`);
    console.log('======================================================\n');
  }
}

export default new MatchingService();
