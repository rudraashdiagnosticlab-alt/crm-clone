import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  // All roles; the service scopes employees to their own activity.
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.activities.list(user, limit ? Number(limit) : 100);
  }
}
