import {
  Controller, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { AuthGuard } from '@/guards/auth.guard.js';
import type { ActionContext } from '@/context/action-context.js';
import { RestActionContextParam } from '@/context/action-context.decorator.js';

interface AuthResponse {
  success: boolean;
}

@Controller('auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  /**
   * Logout endpoint - clears session and all cookies
   */
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @RestActionContextParam() ctx: ActionContext,
  ): Promise<AuthResponse> {
    await this.authService.logoutWithSession(req, res, ctx);

    return { success: true };
  }
}
