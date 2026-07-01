import { Module } from '@nestjs/common';
import { QuoService } from './quo.service';
import { OpenPhoneModule } from '../openphone/openphone.module';

@Module({
  imports: [OpenPhoneModule],
  providers: [QuoService],
  exports: [QuoService],
})
export class QuoModule {}
