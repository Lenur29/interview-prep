import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/user.entity.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthResolver, PublicAuthResolver } from './auth.resolver.js';
import { AuthService } from './auth.service.js';
import { User2faService, UserWith2faResolver } from './2fa/index.js';
import { JwtService } from './jwt/jwt.service.js';
import { OtpResolver } from './otp/otp.resolver.js';
import { OtpService } from './otp/otp.service.js';
import { PasswordAuthResolver, PasswordAuthService } from './password/index.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthResolver,
    PublicAuthResolver,
    JwtService,
    OtpService,
    OtpResolver,
    User2faService,
    UserWith2faResolver,

    PasswordAuthService,
    PasswordAuthResolver,
  ],
  exports: [
    JwtService,
  ],
})
export class AuthModule {}
