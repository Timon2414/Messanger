import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PushService } from './push.service';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private push: PushService) {}

  @Post('subscribe')
  subscribe(@CurrentUser() user: any, @Body() body: any, @Req() req: any) {
    return this.push.subscribe(user.sub, body, req.headers['user-agent']);
  }

  @Delete('subscribe')
  unsubscribe(@CurrentUser() user: any, @Body('endpoint') endpoint: string) {
    return this.push.unsubscribe(endpoint, user.sub);
  }
}
