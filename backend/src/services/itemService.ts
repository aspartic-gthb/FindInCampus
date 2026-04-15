import prisma from '../utils/database';
import { Item, ItemType, ItemStatus } from '@prisma/client';

export interface CreateItemInput {
  type: ItemType;
  title: string;
  description: string;
  category: string;
  location: string;
  reporterId: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  foundDate?: Date;
  lostDate?: Date;
}

export interface UpdateItemInput {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  status?: ItemStatus;
}

export interface SearchFilters {
  type?: ItemType;
  status?: ItemStatus;
  category?: string;
  location?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class ItemService {
  async create(data: CreateItemInput): Promise<Item> {
    return prisma.item.create({
      data: {
        ...data,
        foundDate: data.foundDate ? new Date(data.foundDate) : null,
        lostDate: data.lostDate ? new Date(data.lostDate) : null,
      },
    });
  }

  async findById(id: string): Promise<Item | null> {
    return prisma.item.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        claims: {
          include: {
            claimant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(filters: SearchFilters): Promise<{ items: Item[]; total: number }> {
    const {
      type,
      status,
      category,
      location,
      search,
      limit = 20,
      offset = 0,
    } = filters;

    const where: any = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (category) where.category = category;
    if (location) where.location = { contains: location, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.item.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: UpdateItemInput): Promise<Item> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Item not found');
    }

    return prisma.item.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.item.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: ItemStatus): Promise<Item> {
    return this.update(id, { status });
  }

  async getActiveLostItems(): Promise<Item[]> {
    return prisma.item.findMany({
      where: {
        type: 'LOST',
        status: 'ACTIVE',
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { lostDate: 'desc' },
    });
  }

  async getActiveFoundItems(): Promise<Item[]> {
    return prisma.item.findMany({
      where: {
        type: 'FOUND',
        status: 'ACTIVE',
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new ItemService();
