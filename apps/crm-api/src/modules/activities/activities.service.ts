import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // SEC-004 — audit/activity log, newest first.
  // RBAC: employees see only their own activity; team leaders + admins see the
  // whole team (no team model yet, so "team" = all callers).
  list(user: { id: string; role: Role }, limit = 100) {
    const where = user.role === Role.employee ? { userId: user.id } : {};
    return this.prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        user: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, businessName: true } },
      },
    });
  }

  listLead(leadId: string, user: { id: string; role: Role }, limit = 100) {
    if (user.role === Role.employee) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return this.prisma.activity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        user: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, businessName: true } },
      },
    });
  }
}
