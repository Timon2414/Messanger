import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.chatMember.findMany({
      where: { userId },
      include: { chat: true },
      orderBy: { chat: { lastMessageAt: 'desc' } },
    });
  }

  async createDirect(userId: string, peerId: string) {
    const chat = await this.prisma.chat.create({ data: { type: 'direct' } });
    await this.prisma.chatMember.createMany({
      data: [
        { chatId: chat.id, userId, role: 'member' },
        { chatId: chat.id, userId: peerId, role: 'member' },
      ],
    });
    return chat;
  }

  createGroup(userId: string, body: { title: string; memberIds: string[]; description?: string }) {
    return this.prisma.chat.create({
      data: {
        type: 'group',
        title: body.title,
        description: body.description,
        members: {
          create: [
            { userId, role: 'owner' },
            ...body.memberIds.map((id) => ({ userId: id, role: 'member' as const })),
          ],
        },
      },
      include: { members: true },
    });
  }

  get(chatId: string) {
    return this.prisma.chat.findUnique({ where: { id: chatId }, include: { members: true } });
  }

  messages(chatId: string) {
    return this.prisma.message.findMany({ where: { chatId }, include: { sender: true, reactions: true, attachments: true }, orderBy: { createdAt: 'asc' } });
  }
}
