import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class MeService {
  constructor(private prisma: PrismaService) {}

  me(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  }

  sessions(userId: string) {
    return this.prisma.session.findMany({ where: { userId, revokedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  revokeSession(userId: string, sessionId: string) {
    return this.prisma.session.updateMany({ where: { id: sessionId, userId }, data: { revokedAt: new Date() } });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await argon2.verify(user.passwordHash, oldPassword);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(newPassword), mustChangePassword: false },
    });
  }
}
