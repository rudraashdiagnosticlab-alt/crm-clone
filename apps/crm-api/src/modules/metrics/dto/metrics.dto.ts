import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Timezone } from '@crm/database';

/** Shared dashboard filter (FLT-001..005). */
export class MetricsQueryDto {
  @ApiPropertyOptional({ enum: Timezone })
  @IsOptional()
  @IsEnum(Timezone)
  timezone?: Timezone;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'ISO date — created from' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date — created to' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
