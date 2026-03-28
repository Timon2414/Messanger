import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async send(chatId: string, senderId: string, body: { text?: string; replyToMessageId?: string }) {
    const member = await this.prisma.chatMember.findFirst({ where: { chatId, userId: senderId } });
    if (!member) throw new NotFoundException('Chat not found');

    const message = await this.prisma.message.create({
      data: { chatId, senderId, text: body.text, replyToMessageId: body.replyToMessageId },
      include: { sender: true, reactions: true, attachments: true },
    });

    await this.prisma.chat.update({ where: { id: chatId }, data: { lastMessageAt: message.createdAt } });

    return message;
  }

  async edit(messageId: string, userId: string, text: string) {
    const message = await this.prisma.message.findUniqueOrThrow({ where: { id: messageId } });
    if (message.senderId !== userId) throw new NotFoundException('Not found');
    await this.prisma.messageEditHistory.create({
      data: { messageId, editorId: userId, previousText: message.text },
    });
    return this.prisma.message.update({ where: { id: messageId }, data: { text } });
  }

  async remove(messageId: string, userId: string) {
    const message = await this.prisma.message.findUniqueOrThrow({ where: { id: messageId } });
    if (message.senderId !== userId) throw new NotFoundException('Not found');
    return this.prisma.message.update({ where: { id: messageId }, data: { deletedForAllAt: new Date(), text: '[deleted]' } });
  }

  reaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.reaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
  }
}
