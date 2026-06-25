import { Module } from '@nestjs/common';
import { QuoClient } from './quo.client';
import { QuoService } from './quo.service';

@Module({
  providers: [QuoClient, QuoService],
  exports: [QuoService, QuoClient],
})
export class QuoModule {}
