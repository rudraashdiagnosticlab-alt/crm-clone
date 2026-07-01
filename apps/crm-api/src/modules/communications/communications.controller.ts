import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@crm/database';
import { CommunicationsService } from './communications.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SendSmsDto, CallByPhoneDto } from './dto/communications.dto';

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
  sendSms(@Param('id') id: string, @Body() dto: SendSmsDto, @CurrentUser() user: AuthUser) {
    return this.comms.sendSms(id, dto.body, user.id, dto.from);
  }

  @Post('lead/:id/call')
  startCall(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.comms.startCall(id, user.id);
  }

  /** Dial-pad call to a typed number (resolves/creates the lead, then dials). */
  @Post('call')
  callByPhone(@Body() dto: CallByPhoneDto, @CurrentUser() user: AuthUser) {
    return this.comms.startCallByPhone(dto.phone, user.id);
  }

  /** Live state of an in-progress call — polled ~1s by the in-CRM call widget. */
  @Get('call/:id/state')
  callState(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.comms.getCallState(id, user.id, user.role);
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
