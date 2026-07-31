import { Module, Global } from '@nestjs/common';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [SupabaseAuthService, SupabaseAuthGuard, RolesGuard],
  exports: [SupabaseAuthService, SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}
