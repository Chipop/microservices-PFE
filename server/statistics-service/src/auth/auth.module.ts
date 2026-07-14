import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Global so any controller can use JwtAuthGuard. The signing key is read per
 * request from ConfigService inside the guard, so no secret is bound here.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
