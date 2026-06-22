import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { SendSmsDto } from './dto/communications.dto';

/** Lead communications — timeline + outbound SMS / click-to-call. */
@ApiTags('communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly comms: CommunicationsService) {}

  @Get('lead/:id')
  timeline(@Param('id') id: string) {
    return this.comms.getTimeline(id);
  }

  @Post('lead/:id/sms')
  sendSms(@Param('id') id: string, @Body() dto: SendSmsDto) {
    return this.comms.sendSms(id, dto.body, dto.from);
  }

  @Post('lead/:id/call')
  startCall(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.comms.startCall(id, user.id);
  }
}
