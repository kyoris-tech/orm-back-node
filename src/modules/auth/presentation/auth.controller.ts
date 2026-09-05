import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginThrottlerGuard } from '../infrastructure/guards/login-throttler.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LoginThrottlerGuard)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Headers('x-api-key') apiKey?: string,
  ) {
    return this.authService.login(loginDto, apiKey);
  }
}
