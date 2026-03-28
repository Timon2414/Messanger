import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
  constructor(private prisma: PrismaService) {}

  subscribe(userId: string, body: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
    return this.prisma.notificationSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: {
        userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent,
      },
      update: { userId, p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent },
    });
  }

  unsubscribe(endpoint: string, userId: string) {
    return this.prisma.notificationSubscription.deleteMany({ where: { endpoint, userId } });
  }
}
