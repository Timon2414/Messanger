import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatsService } from './chats.service';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private chats: ChatsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.chats.list(user.sub);
  }

  @Post('direct/:userId')
  direct(@CurrentUser() user: any, @Param('userId') peerId: string) {
    return this.chats.createDirect(user.sub, peerId);
  }

  @Post('group')
  group(@CurrentUser() user: any, @Body() body: { title: string; memberIds: string[]; description?: string }) {
    return this.chats.createGroup(user.sub, body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.chats.get(id);
  }

  @Get(':id/messages')
  messages(@Param('id') id: string) {
    return this.chats.messages(id);
  }
}
