import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@crm/database';
import { ActivitiesService } from './activities.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Roles(Role.admin, Role.team_leader)
  @Get()
  list(@Query('limit') limit?: string) {
    return this.activities.list(limit ? Number(limit) : 100);
  }
}
