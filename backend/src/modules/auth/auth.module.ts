import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, minutes } from '@nestjs/throttler';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MediaTeamMembersModule } from '../media-team-members/media-team-members.module';
import { TermiiModule } from '../../common/termii/termii.module';

@Module({
  imports: [
    MediaTeamMembersModule,
    TermiiModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('jwtSecret'),
        // expiresIn's type is a `ms`-package template-literal ("1d", "15m", ...), which
        // a plain `string` from ConfigService can't structurally satisfy — the value is
        // a runtime-valid duration string (JWT_EXPIRES_IN in .env), so the cast is safe.
        signOptions: {
          expiresIn: configService.get<string>('jwtExpiresIn') as SignOptions['expiresIn'],
        },
      }),
    }),
    // Scoped to this module only, not registered as a global APP_GUARD — the rest of
    // the API (including the Contributions return page's 3s GET /contributions/:id
    // poll loop) must never be rate-limited by this. ThrottlerGuard is applied per-route
    // below on exactly the four endpoints the audit flagged as unthrottled brute-force/
    // enumeration/SMS-bombing surfaces. This 'default' throttler is a fallback only —
    // every route below overrides it with its own @Throttle().
    ThrottlerModule.forRoot([{ name: 'default', ttl: minutes(1), limit: 10 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
