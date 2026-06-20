import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallOutcome } from '@crm/database';

export class StartCallDto {
  @ApiProperty()
  @IsUUID()
  leadId: string;
}

export class EndCallDto {
  @ApiProperty({ enum: CallOutcome })
  @IsEnum(CallOutcome)
  outcome: CallOutcome;

  @ApiPropertyOptional({ description: 'Duration in seconds; computed from start time if omitted' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSecs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordingUrl?: string;
}

export class CreateNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  noteText: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextFollowupDate?: string;
}
