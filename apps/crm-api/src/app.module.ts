import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LeadsModule } from './modules/leads/leads.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { TargetsModule } from './modules/targets/targets.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { CallsModule } from './modules/calls/calls.module';
import { ProductivityModule } from './modules/productivity/productivity.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ConfigStatusModule } from './modules/config/config-status.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { OpenPhoneModule } from './modules/openphone/openphone.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { MailModule } from './modules/mail/mail.module';
import { CallbacksModule } from './modules/callbacks/callbacks.module';
import { OutcomesModule } from './modules/outcomes/outcomes.module';
import { ZoomModule } from './modules/zoom/zoom.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    // SEC-008 — global throttle baseline; login has a tighter limit in AuthController
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    MailModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    MetricsModule,
    TargetsModule,
    AssignmentsModule,
    CallsModule,
    ProductivityModule,
    NotificationsModule,
    AiModule,
    ActivitiesModule,
    ConfigStatusModule,
    TasksModule,
    CalendarModule,
    PreferencesModule,
    OpenPhoneModule,
    IntegrationsModule,
    CommunicationsModule,
    CallbacksModule,
    OutcomesModule,
    ZoomModule,
    AvailabilityModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}


