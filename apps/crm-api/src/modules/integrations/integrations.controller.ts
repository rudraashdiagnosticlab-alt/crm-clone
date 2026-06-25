import { Body, Controller, Delete, Get, Param, Put, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@crm/database';
import { Roles } from '../../common/decorators/roles.decorator';
import { IntegrationConfigService, type IntegrationProvider } from './integration-config.service';
import { OpenPhoneService } from '../openphone/openphone.service';
import { ConnectOpenPhoneDto, ConnectQuoDto } from './dto/integration.dto';

/** Admin-managed integration credentials (entered from the UI, stored in DB). */
@ApiTags('integrations')
@ApiBearerAuth()
@Roles(Role.admin)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly config: IntegrationConfigService,
    private readonly openphone: OpenPhoneService,
  ) {}

  @Get('status')
  status() {
    return this.config.status();
  }

  @Put('openphone')
  async connectOpenPhone(@Body() dto: ConnectOpenPhoneDto) {
    await this.config.set('openphone', { OPENPHONE_API_KEY: dto.apiKey, OPENPHONE_BASE_URL: dto.baseUrl, OPENPHONE_WEBHOOK_SECRET: dto.webhookSecret });
    // Verify immediately by probing the live API (lists workspace numbers).
    const probe = await this.openphone.status();
    return { ...this.config.status().openphone, connected: probe.connected, error: probe.error, phoneNumbers: probe.phoneNumbers };
  }

  @Put('quo')
  async connectQuo(@Body() dto: ConnectQuoDto) {
    await this.config.set('quo', { QUO_BASE_URL: dto.baseUrl, QUO_API_KEY: dto.apiKey, QUO_QUEUE_ID: dto.queueId });
    return this.config.status().quo;
  }

  @Delete(':provider')
  async disconnect(@Param('provider') provider: string) {
    if (provider !== 'openphone' && provider !== 'quo') throw new BadRequestException('Unknown provider');
    await this.config.clear(provider as IntegrationProvider);
    return this.config.status();
  }
}
