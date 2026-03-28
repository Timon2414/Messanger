import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MeService } from './me.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private meService: MeService) {}

  @Get()
  me(@CurrentUser() user: any) {
    return this.meService.me(user.sub);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: any) {
    return this.meService.sessions(user.sub);
  }

  @Delete('sessions/:id')
  deleteSession(@CurrentUser() user: any, @Param('id') id: string) {
    return this.meService.revokeSession(user.sub, id);
  }

  @Patch('password')
  changePassword(@CurrentUser() user: any, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.meService.changePassword(user.sub, body.oldPassword, body.newPassword);
  }
}
