import { Module } from '@nestjs/common';
import { OpenPhoneClient } from './openphone.client';
import { OpenPhoneService } from './openphone.service';
import { OpenPhoneController } from './openphone.controller';

@Module({
  controllers: [OpenPhoneController],
  providers: [OpenPhoneClient, OpenPhoneService],
  exports: [OpenPhoneService],
})
export class OpenPhoneModule {}
