import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/app-config.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AnimalsModule } from './modules/animals/animals.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { AdoptersModule } from './modules/adopters/adopters.module';
import { AdoptionsModule } from './modules/adoptions/adoptions.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { KpisModule } from './modules/kpis/kpis.module';
import { MailModule } from './modules/mail/mail.module';
import { PublicModule } from './modules/public/public.module';
import { ChatModule } from './modules/chat/chat.module';
import { ContactModule } from './modules/contact/contact.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SerializeInterceptor } from './common/interceptors/serialize.interceptor';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    StorageModule,
    HealthModule,
    JwtModule.register({ global: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      errorMessage: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    }),
    AuthModule,
    UsersModule,
    AnimalsModule,
    ClinicalModule,
    CatalogsModule,
    AdoptersModule,
    AdoptionsModule,
    RecommendationModule,
    DashboardModule,
    KpisModule,
    MailModule,
    PublicModule,
    ChatModule,
    ContactModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: SerializeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
