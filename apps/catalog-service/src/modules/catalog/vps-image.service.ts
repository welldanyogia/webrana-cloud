import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageNotFoundException, DuplicateEntryException } from '../../common/exceptions';
import { ImageCategory } from '@prisma/client';

export interface CreateImageInput {
  provider: string;
  providerSlug: string;
  displayName: string;
  description?: string;
  category?: ImageCategory;
  version?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateImageInput {
  provider?: string;
  providerSlug?: string;
  displayName?: string;
  description?: string;
  category?: ImageCategory;
  version?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ImageResponse {
  id: string;
  provider: string;
  providerSlug: string;
  displayName: string;
  description: string | null;
  category: string;
  version: string | null;
  isActive: boolean;
  sortOrder: number;
}

@Injectable()
export class VpsImageService {
  private readonly logger = new Logger(VpsImageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveImages(planId?: string): Promise<{ data: ImageResponse[] }> {
    let images;

    if (planId) {
      const planImages = await this.prisma.vpsPlanImage.findMany({
        where: { planId },
        include: {
          image: true,
        },
        orderBy: { image: { sortOrder: 'asc' } },
      });

      images = planImages
        .filter((pi) => pi.image.isActive)
        .map((pi) => pi.image);
    } else {
      images = await this.prisma.vpsImage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return {
      data: images.map((img) => ({
        id: img.id,
        provider: img.provider,
        providerSlug: img.providerSlug,
        displayName: img.displayName,
        description: img.description,
        category: img.category,
        version: img.version,
        isActive: img.isActive,
        sortOrder: img.sortOrder,
      })),
    };
  }

  async getAllImages(): Promise<{ data: ImageResponse[] }> {
    const images = await this.prisma.vpsImage.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return {
      data: images.map((img) => ({
        id: img.id,
        provider: img.provider,
        providerSlug: img.providerSlug,
        displayName: img.displayName,
        description: img.description,
        category: img.category,
        version: img.version,
        isActive: img.isActive,
        sortOrder: img.sortOrder,
      })),
    };
  }

  async getImageById(id: string): Promise<{ data: ImageResponse }> {
    const image = await this.prisma.vpsImage.findUnique({ where: { id } });

    if (!image) {
      throw new ImageNotFoundException();
    }

    return {
      data: {
        id: image.id,
        provider: image.provider,
        providerSlug: image.providerSlug,
        displayName: image.displayName,
        description: image.description,
        category: image.category,
        version: image.version,
        isActive: image.isActive,
        sortOrder: image.sortOrder,
      },
    };
  }

  async createImage(input: CreateImageInput) {
    const existing = await this.prisma.vpsImage.findUnique({
      where: {
        provider_providerSlug: {
          provider: input.provider,
          providerSlug: input.providerSlug,
        },
      },
    });

    if (existing) {
      throw new DuplicateEntryException('Image dengan provider dan slug ini');
    }

    const image = await this.prisma.vpsImage.create({
      data: {
        provider: input.provider,
        providerSlug: input.providerSlug,
        displayName: input.displayName,
        description: input.description,
        category: input.category ?? ImageCategory.OS,
        version: input.version,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return { data: image };
  }

  async updateImage(id: string, input: UpdateImageInput) {
    const existing = await this.prisma.vpsImage.findUnique({ where: { id } });
    if (!existing) {
      throw new ImageNotFoundException();
    }

    if (input.provider && input.providerSlug) {
      const duplicate = await this.prisma.vpsImage.findFirst({
        where: {
          provider: input.provider,
          providerSlug: input.providerSlug,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new DuplicateEntryException('Image dengan provider dan slug ini');
      }
    }

    const image = await this.prisma.vpsImage.update({
      where: { id },
      data: {
        provider: input.provider,
        providerSlug: input.providerSlug,
        displayName: input.displayName,
        description: input.description,
        category: input.category,
        version: input.version,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });

    return { data: image };
  }

  async deleteImage(id: string) {
    const existing = await this.prisma.vpsImage.findUnique({ where: { id } });
    if (!existing) {
      throw new ImageNotFoundException();
    }

    await this.prisma.vpsImage.delete({ where: { id } });

    return { data: { message: 'Image berhasil dihapus' } };
  }
}
