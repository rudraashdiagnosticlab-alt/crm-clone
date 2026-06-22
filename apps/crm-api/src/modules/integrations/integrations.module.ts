import { Module } from '@nestjs/common';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationsController } from './integrations.controller';
import { OpenPhoneModule } from '../openphone/openphone.module';

@Module({
  imports: [OpenPhoneModule],
  controllers: [IntegrationsController],
  providers: [IntegrationConfigService],
  exports: [IntegrationConfigService],
})
export class IntegrationsModule {}
