import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // SEC-004 — audit/activity log, newest first
  list(limit = 100) {
    return this.prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        user: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, businessName: true } },
      },
    });
  }
}
