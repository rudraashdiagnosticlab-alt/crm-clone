import { Injectable } from '@nestjs/common';
import { NotificationType, Role } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // NTF-004 — unread badge count
  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { success: true };
  }

  /** Create one notification (used by this module's test endpoint). */
  create(userId: string, type: NotificationType, title: string, body: string) {
    return this.prisma.notification.create({ data: { userId, type, title, body } });
  }

  /**
   * Fan-out a notification to every admin + team leader (NTF-001..003).
   * Used by other modules (imports, target alerts) via the shared service.
   */
  async notifyManagers(type: NotificationType, title: string, body: string) {
    const managers = await this.prisma.user.findMany({
      where: { role: { in: [Role.admin, Role.team_leader] }, isActive: true },
      select: { id: true },
    });
    if (managers.length === 0) return { created: 0 };
    await this.prisma.notification.createMany({
      data: managers.map((m) => ({ userId: m.id, type, title, body })),
    });
    return { created: managers.length };
  }
}
