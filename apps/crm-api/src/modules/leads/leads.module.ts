import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { QuoModule } from '../quo/quo.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [QuoModule, NotificationsModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
