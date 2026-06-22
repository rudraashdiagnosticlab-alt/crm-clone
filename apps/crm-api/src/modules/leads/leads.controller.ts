import { Body, Controller, Get, Param, Post, Query, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@crm/database';
import { LeadsService } from './leads.service';
import { QuoService } from '../quo/quo.service';
import { CreateLeadDto, ImportLeadsDto, ListLeadsQueryDto } from './dto/lead.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly quo: QuoService,
  ) {}

  // Upload/create leads — Admin + Team Leader (Permission Matrix)
  @Roles(Role.admin, Role.team_leader)
  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }

  // IMP-001 — bulk import parsed rows
  @Roles(Role.admin, Role.team_leader)
  @Post('import')
  @HttpCode(200)
  bulkImport(@Body() dto: ImportLeadsDto) {
    return this.leads.bulkImport(dto);
  }

  // Employees see only their assigned leads; admins/leaders see all.
  @Get()
  findAll(@Query() query: ListLeadsQueryDto, @CurrentUser() user: AuthUser) {
    return this.leads.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leads.findOne(id, user);
  }

  // ── Quo integration ──
  // Trigger: send this lead to Quo, store the response, return the result.
  @Roles(Role.admin, Role.team_leader)
  @Post(':id/quo-sync')
  @HttpCode(200)
  syncToQuo(@Param('id') id: string) {
    return this.quo.syncLead(id);
  }

  @Get(':id/quo-logs')
  quoLogs(@Param('id') id: string) {
    return this.quo.getLogs(id);
  }
}
