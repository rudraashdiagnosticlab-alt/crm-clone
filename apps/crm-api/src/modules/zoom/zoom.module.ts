import { Module } from '@nestjs/common';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';
import { ZoomRemindersService } from './zoom-reminders.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ZoomController],
  providers: [ZoomService, ZoomRemindersService],
  exports: [ZoomService],
})
export class ZoomModule {}
