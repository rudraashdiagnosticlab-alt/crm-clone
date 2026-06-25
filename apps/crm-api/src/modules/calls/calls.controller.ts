import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { StartCallDto, EndCallDto, CreateNoteDto, UpdateFollowupDto } from './dto/call.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('calls')
@ApiBearerAuth()
@Controller('calls')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  // CAL-001..005 — caller dashboard KPIs for the logged-in caller
  @Get('caller/dashboard')
  callerDashboard(@CurrentUser() user: AuthUser) {
    return this.calls.callerDashboard(user.id);
  }

  // CAL-006 — caller's assigned lead queue
  @Get('caller/leads')
  myLeads(@CurrentUser() user: AuthUser) {
    return this.calls.myLeads(user.id);
  }

  // CAL-016 — next unworked assigned lead
  @Get('next-lead')
  nextLead(@CurrentUser() user: AuthUser) {
    return this.calls.nextLead(user.id);
  }

  // CAL-013 — upcoming follow-ups. Employees are scoped to their own; managers
  // see all and may filter by a specific caller (?userId=).
  @Get('followups')
  followups(@CurrentUser() user: AuthUser, @Query('userId') userId?: string) {
    return this.calls.followups({ id: user.id, role: user.role }, userId);
  }

  @Post('followups/:kind/:id/complete')
  completeFollowup(@Param('kind') kind: 'note' | 'lead', @Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.calls.completeFollowup(kind, id, user.id);
  }

  @Post('followups/:kind/:id')
  updateFollowup(
    @Param('kind') kind: 'note' | 'lead',
    @Param('id') id: string,
    @Body() dto: UpdateFollowupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.calls.updateFollowup(kind, id, dto, user.id);
  }

  @Get('outcomes')
  outcomes(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('outcome') outcome?: string,
    @Query('userId') userId?: string,
  ) {
    return this.calls.outcomes({ from, to, outcome, userId }, { id: user.id, role: user.role });
  }

  // CAL-015 — call + note history for a lead
  @Get()
  history(@Query('leadId') leadId: string) {
    return this.calls.history(leadId);
  }

  @Post('start')
  start(@Body() dto: StartCallDto, @CurrentUser() user: AuthUser) {
    return this.calls.start(dto, user.id);
  }

  @Post(':id/end')
  end(@Param('id') id: string, @Body() dto: EndCallDto, @CurrentUser() user: AuthUser) {
    return this.calls.end(id, dto, user.id);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() dto: CreateNoteDto, @CurrentUser() user: AuthUser) {
    return this.calls.addNoteToCall(id, dto, user.id);
  }
}
