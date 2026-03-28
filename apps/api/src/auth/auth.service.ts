import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user || !user.isActive) throw new UnauthorizedException('Неверные учетные данные');
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Неверные учетные данные');

    const accessToken = await this.jwt.signAsync({ sub: user.id, username: user.username, role: user.role });
    const refreshRaw = randomUUID();
    const refreshTokenHash = await argon2.hash(refreshRaw);
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    return {
      accessToken,
      refreshToken: `${session.id}.${refreshRaw}`,
      mustChangePassword: user.mustChangePassword,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async refresh(token: string) {
    const [sessionId, secret] = token.split('.');
    const session = await this.prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) throw new UnauthorizedException();
    const ok = await argon2.verify(session.refreshTokenHash, secret);
    if (!ok) throw new UnauthorizedException();
    const accessToken = await this.jwt.signAsync({ sub: session.user.id, username: session.user.username, role: session.user.role });
    return { accessToken };
  }

  async logout(sessionId: string) {
    await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    return { success: true };
  }
}
