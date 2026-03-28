import { Body, Controller, Get, Header, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'superadmin', 'moderator', 'support')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  users(@Query('q') q?: string, @Query('role') role?: string, @Query('isActive') isActive?: string) {
    return this.admin.users(q, role, isActive === undefined ? undefined : isActive === 'true');
  }

  @Get('users/:id')
  userDetail(@Param('id') id: string) {
    return this.admin.userDetail(id);
  }

  @Post('users')
  createUser(@Body() body: any, @CurrentUser() user: any) {
    return this.admin.createUser(body, user.sub);
  }

  @Patch('users/:id')
  patchUser(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.admin.updateUser(id, body, user.sub);
  }

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body('password') password: string, @CurrentUser() user: any) {
    return this.admin.resetPassword(id, password, user.sub);
  }

  @Post('users/:id/revoke-sessions')
  revoke(@Param('id') id: string, @CurrentUser() user: any) {
    return this.admin.revokeSessions(id, user.sub);
  }

  @Get('chats')
  chats(@Query('q') q?: string) {
    return this.admin.chats(q);
  }

  @Patch('chats/:id/status')
  setChatStatus(@Param('id') id: string, @Body('isDisabled') isDisabled: boolean, @CurrentUser() user: any) {
    return this.admin.setChatStatus(id, isDisabled, user.sub);
  }

  @Post('messages/:id/delete')
  deleteMessage(@Param('id') id: string, @Body('reason') reason: string | undefined, @CurrentUser() user: any) {
    return this.admin.deleteMessage(id, user.sub, reason);
  }

  @Get('audit-logs')
  logs(@Query('limit') limit?: string, @Query('action') action?: string) {
    return this.admin.auditLogs(limit ? Number(limit) : undefined, action);
  }

  @Get('audit-logs.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async logsCsv(@Query('limit') limit?: string) {
    return this.admin.auditLogsCsv(limit ? Number(limit) : undefined);
  }

  @Get('reports')
  reports(@Query('status') status?: 'open' | 'resolved') {
    return this.admin.reports(status);
  }

  @Post('reports/:id/resolve')
  resolveReport(@Param('id') id: string, @CurrentUser() user: any) {
    return this.admin.resolveReport(id, user.sub);
  }

  @Get('settings')
  settings() {
    return this.admin.settings();
  }

  @Post('settings')
  upsertSetting(@Body() body: { key: string; value: unknown }, @CurrentUser() user: any) {
    return this.admin.upsertSetting(body.key, body.value, user.sub);
  }
}
