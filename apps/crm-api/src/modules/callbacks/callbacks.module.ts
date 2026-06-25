import { Module } from '@nestjs/common';
import { CallbacksService } from './callbacks.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [CallbacksService],
  exports: [CallbacksService],
})
export class CallbacksModule {}
