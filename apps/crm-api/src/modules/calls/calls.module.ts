import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutcomesModule } from '../outcomes/outcomes.module';

@Module({
  imports: [NotificationsModule, OutcomesModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
