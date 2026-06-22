import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';

/** Unified conversation timeline (calls + SMS + notes) for a lead. */
@ApiTags('communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly comms: CommunicationsService) {}

  @Get('lead/:id')
  timeline(@Param('id') id: string) {
    return this.comms.getTimeline(id);
  }
}
