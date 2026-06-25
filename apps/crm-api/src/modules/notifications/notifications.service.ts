import { Injectable } from '@nestjs/common';
import { NotificationType, Role } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const EMAIL_SETTINGS_KEY = 'callbacks:email_settings';

// Notification types whose emails are admin-toggleable (req 7).
export type ToggleableType = 'callback_reminder' | 'callback_due' | 'callback_missed';

export interface EmailSettings {
  /** Configurable distribution list — emailed in addition to the assigned user. */
  recipients: string[];
  /** Per-type email enable flags (default on). */
  types: Record<ToggleableType, boolean>;
}

const DEFAULT_TYPES: Record<ToggleableType, boolean> = {
  callback_reminder: true,
  callback_due: true,
  callback_missed: true,
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

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

  /**
   * Admin-configurable email settings (req 7): the recipient distribution list
   * and per-type email toggles, stored in AppSetting `callbacks:email_settings`.
   */
  async getEmailSettings(): Promise<EmailSettings> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: EMAIL_SETTINGS_KEY } });
    const v = (row?.value ?? {}) as Partial<EmailSettings>;
    return {
      recipients: Array.isArray(v.recipients) ? v.recipients.filter((e): e is string => typeof e === 'string') : [],
      types: { ...DEFAULT_TYPES, ...(v.types ?? {}) },
    };
  }

  async updateEmailSettings(input: { recipients: string[]; types?: Partial<Record<ToggleableType, boolean>> }): Promise<EmailSettings> {
    const recipients = Array.from(
      new Set((input.recipients ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean)),
    );
    const types = { ...DEFAULT_TYPES, ...(input.types ?? {}) };
    const value = { recipients, types };
    await this.prisma.appSetting.upsert({
      where: { key: EMAIL_SETTINGS_KEY },
      update: { value },
      create: { key: EMAIL_SETTINGS_KEY, value },
    });
    return value;
  }

  /**
   * Create an in-app notification for one user AND send the matching email.
   * `email` is the assigned user's address; the configured distribution list
   * (req 7) is emailed in addition. Emails for toggleable callback types are
   * suppressed when the admin has disabled that type. Email is best-effort.
   */
  async notifyAndEmail(
    userId: string | null,
    type: NotificationType,
    title: string,
    body: string,
    opts: { email?: string | null; alsoManagers?: boolean } = {},
  ) {
    if (userId) {
      await this.prisma.notification.create({ data: { userId, type, title, body } });
    }
    if (opts.alsoManagers) {
      await this.notifyManagers(type, title, body);
    }

    const settings = await this.getEmailSettings();
    // Toggleable callback types respect the admin switch; other types always send.
    if (type in settings.types && !settings.types[type as ToggleableType]) return;

    const recipients = new Set<string>();
    if (opts.email) recipients.add(opts.email);
    for (const r of settings.recipients) recipients.add(r);
    if (recipients.size > 0) {
      await this.mail.send({
        to: Array.from(recipients),
        subject: title,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        text: body,
      });
    }
  }
}
