import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@crm/database';
import { ProductivityService } from './productivity.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('productivity')
@ApiBearerAuth()
@Controller('productivity')
export class ProductivityController {
  constructor(private readonly productivity: ProductivityService) {}

  @Roles(Role.admin, Role.team_leader)
  @Get()
  perCaller() {
    return this.productivity.perCaller();
  }

  @Roles(Role.admin, Role.team_leader)
  @Get('daily-summary')
  dailySummary() {
    return this.productivity.dailySummary();
  }

  @Roles(Role.admin, Role.team_leader)
  @Get('team-live')
  teamLive() {
    return this.productivity.teamLive();
  }
}
