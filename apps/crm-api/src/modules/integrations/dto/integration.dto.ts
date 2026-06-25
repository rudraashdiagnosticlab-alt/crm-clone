import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectOpenPhoneDto {
  @ApiProperty({ description: 'OpenPhone API key' })
  @IsString()
  @MinLength(1)
  apiKey: string;

  @ApiPropertyOptional({ description: 'Override API base URL' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Webhook signing secret (HMAC-SHA256)' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;
}

export class ConnectQuoDto {
  @ApiProperty({ description: 'Quo API base URL' })
  @IsString()
  @MinLength(1)
  baseUrl: string;

  @ApiProperty({ description: 'Quo API key' })
  @IsString()
  @MinLength(1)
  apiKey: string;

  @ApiPropertyOptional({ description: 'Quo call-queue id — outbound calls route through it' })
  @IsOptional()
  @IsString()
  queueId?: string;
}
