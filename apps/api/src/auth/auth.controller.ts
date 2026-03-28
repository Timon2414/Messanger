import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto, req.headers['user-agent'], req.ip);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken?: string) {
    if (!refreshToken) throw new UnauthorizedException();
    return this.auth.refresh(refreshToken);
  }

  @Post('logout')
  logout(@Body('sessionId') sessionId: string) {
    return this.auth.logout(sessionId);
  }
}
