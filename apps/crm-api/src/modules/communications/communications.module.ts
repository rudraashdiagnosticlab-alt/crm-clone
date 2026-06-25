import { Module } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { WebhooksController } from './webhooks.controller';
import { OpenPhoneModule } from '../openphone/openphone.module';
import { QuoModule } from '../quo/quo.module';

@Module({
  imports: [OpenPhoneModule, QuoModule],
  controllers: [CommunicationsController, WebhooksController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
