import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const [users, sessions, chats, messages, files, reportsOpen, recent, messageTrend7d, usersByRole] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.session.count({ where: { revokedAt: null } }),
      this.prisma.chat.count(),
      this.prisma.message.count(),
      this.prisma.attachment.count(),
      this.prisma.report.count({ where: { resolvedAt: null } }),
      this.prisma.auditLog.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
      this.getMessageTrend(7),
      this.prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    ]);

    return {
      counters: { users, sessions, chats, messages, files, reportsOpen },
      messageTrend7d,
      usersByRole: usersByRole.map((x) => ({ role: x.role, count: x._count.role })),
      recent,
    };
  }

  users(query?: string, role?: string, isActive?: boolean) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(query ? { username: { contains: query, mode: 'insensitive' } } : {}),
        ...(role ? { role: role as any } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: {
        profile: true,
        _count: {
          select: {
            sessions: true,
            messages: true,
            chatMembers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async userDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        sessions: { where: { revokedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 },
        _count: {
          select: { messages: true, chatMembers: true, sessions: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(data: { username: string; password: string; role: any; displayName?: string }, actorId: string) {
    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        passwordHash: await argon2.hash(data.password),
        role: data.role,
        mustChangePassword: true,
        profile: { create: { displayName: data.displayName || data.username } },
      },
    });
    await this.audit(actorId, user.id, 'admin.user.create', { username: data.username, role: data.role });
    return user;
  }

  async updateUser(id: string, data: { isActive?: boolean; role?: any; mustChangePassword?: boolean }, actorId: string) {
    const user = await this.prisma.user.update({ where: { id }, data });
    await this.audit(actorId, id, 'admin.user.update', data);
    return user;
  }

  async resetPassword(id: string, newPassword: string, actorId: string) {
    await this.prisma.user.update({ where: { id }, data: { passwordHash: await argon2.hash(newPassword), mustChangePassword: true } });
    await this.audit(actorId, id, 'admin.user.reset_password', {});
    return { success: true };
  }

  async revokeSessions(id: string, actorId: string) {
    await this.prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit(actorId, id, 'admin.user.revoke_sessions', {});
    return { success: true };
  }

  chats(query?: string) {
    return this.prisma.chat.findMany({
      where: query ? { OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] } : {},
      include: { members: true, _count: { select: { messages: true, members: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async setChatStatus(chatId: string, isDisabled: boolean, actorId: string) {
    const chat = await this.prisma.chat.update({ where: { id: chatId }, data: { isDisabled } });
    await this.audit(actorId, null, 'admin.chat.status', { chatId, isDisabled });
    return chat;
  }

  async deleteMessage(messageId: string, actorId: string, reason?: string) {
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedForAllAt: new Date(), text: '[removed by moderation]' },
    });
    await this.audit(actorId, message.senderId, 'admin.message.delete', { messageId, reason: reason ?? null });
    return message;
  }

  auditLogs(limit = 200, action?: string) {
    return this.prisma.auditLog.findMany({
      where: action ? { action: { contains: action, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 1000),
    });
  }

  async auditLogsCsv(limit = 1000) {
    const rows = await this.auditLogs(limit);
    const header = ['id', 'createdAt', 'action', 'actorId', 'targetUserId', 'ipAddress'];
    const csv = [header.join(',')]
      .concat(rows.map((r) => [r.id, r.createdAt.toISOString(), r.action, r.actorId ?? '', r.targetUserId ?? '', r.ipAddress ?? ''].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')))
      .join('\n');
    return csv;
  }

  reports(status?: 'open' | 'resolved') {
    return this.prisma.report.findMany({
      where: status === 'open' ? { resolvedAt: null } : status === 'resolved' ? { NOT: { resolvedAt: null } } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveReport(reportId: string, actorId: string) {
    const report = await this.prisma.report.update({ where: { id: reportId }, data: { resolvedAt: new Date() } });
    await this.audit(actorId, report.targetUserId ?? null, 'admin.report.resolve', { reportId });
    return report;
  }

  settings() {
    return this.prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async upsertSetting(key: string, value: unknown, actorId: string) {
    const setting = await this.prisma.appSetting.upsert({ where: { key }, create: { key, value: value as any, updatedById: actorId }, update: { value: value as any, updatedById: actorId } });
    await this.audit(actorId, null, 'admin.settings.upsert', { key, value });
    return setting;
  }

  private async getMessageTrend(days: number) {
    const points: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() - i);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      const count = await this.prisma.message.count({ where: { createdAt: { gte: start, lt: end } } });
      points.push({ date: start.toISOString().slice(0, 10), count });
    }
    return points;
  }

  private audit(actorId: string, targetUserId: string | null, action: string, details: unknown) {
    return this.prisma.auditLog.create({ data: { actorId, targetUserId, action, details: details as any } });
  }
}
