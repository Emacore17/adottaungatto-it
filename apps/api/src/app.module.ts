import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { GeographyModule } from './geography/geography.module';
import { HealthController } from './health/health.controller';
import { ListingsModule } from './listings/listings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule, AuthModule, GeographyModule, ListingsModule],
  controllers: [HealthController],
})
export class AppModule {}
