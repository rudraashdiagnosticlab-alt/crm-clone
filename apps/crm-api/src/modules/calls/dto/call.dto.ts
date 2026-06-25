import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartCallDto {
  @ApiProperty()
  @IsUUID()
  leadId: string;
}

export class EndCallDto {
  @ApiProperty({ description: 'Outcome slug (see configurable Outcome list)' })
  @IsString()
  @MinLength(1)
  outcome: string;

  @ApiPropertyOptional({ description: 'Duration in seconds; computed from start time if omitted' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSecs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @ApiPropertyOptional({ description: 'Callback or interested follow-up time in ISO format' })
  @IsOptional()
  @IsDateString()
  callbackAt?: string;
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

  @ApiPropertyOptional({ description: 'Reminder callback time in ISO format' })
  @IsOptional()
  @IsDateString()
  callbackAt?: string;
}

export class UpdateFollowupDto {
  @ApiPropertyOptional({ description: 'Updated follow-up note text' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  noteText?: string;

  @ApiPropertyOptional({ description: 'Updated follow-up time in ISO format' })
  @IsOptional()
  @IsDateString()
  followUpAt?: string;
}
