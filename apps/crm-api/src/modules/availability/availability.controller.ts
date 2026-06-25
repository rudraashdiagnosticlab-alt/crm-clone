import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  status(@CurrentUser() user: AuthUser) {
    return this.availability.status(user.id);
  }

  // Mark offline (Leave / Holiday / Unavailable) → auto-reassign pending work.
  @Post('offline')
  offline(@CurrentUser() user: AuthUser, @Body('reason') reason?: string) {
    return this.availability.setOffline(user.id, reason);
  }

  @Post('online')
  online(@CurrentUser() user: AuthUser) {
    return this.availability.setOnline(user.id);
  }

  // Logout / end-of-day — sets offline status only (no reassignment).
  @Post('sign-out')
  signOut(@CurrentUser() user: AuthUser) {
    return this.availability.signOut(user.id);
  }

  // Reassigned-work feed for the current user's dashboard.
  @Get('inbox')
  inbox(@CurrentUser() user: AuthUser) {
    return this.availability.inbox(user.id);
  }

  @Post('inbox/:id/ack')
  ack(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.availability.acknowledge(id, user.id);
  }
}
