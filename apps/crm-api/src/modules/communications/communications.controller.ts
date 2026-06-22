import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@crm/database';
import { CommunicationsService } from './communications.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SendSmsDto } from './dto/communications.dto';

/** PERM: recordings/transcripts/AI summaries are admin + team-leader only. */
const canViewRecordings = (role: Role) => role === Role.admin || role === Role.team_leader;

/** Lead communications — timeline + outbound SMS / click-to-call + analytics. */
@ApiTags('communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly comms: CommunicationsService) {}

  @Get('lead/:id')
  timeline(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.comms.getTimeline(id, canViewRecordings(user.role));
  }

  @Post('lead/:id/sms')
  sendSms(@Param('id') id: string, @Body() dto: SendSmsDto) {
    return this.comms.sendSms(id, dto.body, dto.from);
  }

  @Post('lead/:id/call')
  startCall(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.comms.startCall(id, user.id);
  }

  /** Polled by the incoming-call popup. */
  @Get('incoming/latest')
  latestIncoming(@CurrentUser() user: AuthUser) {
    return this.comms.latestIncoming(user.id, user.role);
  }

  /** Communication analytics — managers only. */
  @Roles(Role.admin, Role.team_leader)
  @Get('analytics')
  analytics(@Query('period') period?: string) {
    return this.comms.getAnalytics(period);
  }
}
