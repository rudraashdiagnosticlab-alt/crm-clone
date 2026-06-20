import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Timezone } from '@crm/database';

export class ManualAssignDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  leadIds: string[];

  @ApiProperty()
  @IsUUID()
  callerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchName?: string;
}

export enum AssignStrategy {
  equal = 'equal',
  state = 'state',
  timezone = 'timezone',
}

export class AutoAssignDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  callerIds: string[];

  @ApiProperty({ enum: AssignStrategy })
  @IsEnum(AssignStrategy)
  strategy: AssignStrategy;

  @ApiPropertyOptional({ enum: Timezone, description: 'Only assign leads in this timezone' })
  @IsOptional()
  @IsEnum(Timezone)
  timezone?: Timezone;

  @ApiPropertyOptional({ description: 'Only assign leads in this state' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchName?: string;
}
