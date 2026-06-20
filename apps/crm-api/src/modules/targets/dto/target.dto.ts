import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Timezone } from '@crm/database';

export class UpsertTargetDto {
  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty({ enum: Timezone })
  @IsEnum(Timezone)
  timezone: Timezone;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  monthlyTarget: number;
}

export class ListTargetsQueryDto {
  @ApiPropertyOptional({ enum: Timezone })
  @IsOptional()
  @IsEnum(Timezone)
  timezone?: Timezone;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;
}
