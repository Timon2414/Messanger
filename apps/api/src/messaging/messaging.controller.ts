import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(
    private messaging: MessagingService,
    private gateway: MessagingGateway,
  ) {}

  @Post('chats/:id/messages')
  async send(@Param('id') chatId: string, @CurrentUser() user: any, @Body() body: { text?: string; replyToMessageId?: string }) {
    const message = await this.messaging.send(chatId, user.sub, body);
    this.gateway.emitMessage(chatId, message);
    return message;
  }

  @Patch('messages/:id')
  edit(@Param('id') id: string, @CurrentUser() user: any, @Body('text') text: string) {
    return this.messaging.edit(id, user.sub, text);
  }

  @Delete('messages/:id')
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.messaging.remove(id, user.sub);
  }

  @Post('messages/:id/reactions')
  reaction(@Param('id') id: string, @CurrentUser() user: any, @Body('emoji') emoji: string) {
    return this.messaging.reaction(id, user.sub, emoji);
  }
}
