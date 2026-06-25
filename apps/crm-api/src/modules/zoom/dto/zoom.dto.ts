import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ZoomMeetingStatus } from '@crm/database';

export class CreateZoomMeetingDto {
  @ApiProperty()
  @IsUUID()
  leadId: string;

  @ApiProperty({ description: 'Scheduled meeting time (ISO)' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  @Type(() => Number)
  durationMins?: number;

  @ApiPropertyOptional({ description: 'Zoom join URL' })
  @IsOptional()
  @IsString()
  joinUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passcode?: string;

  @ApiPropertyOptional({ description: 'Organizer/host; defaults to current user' })
  @IsOptional()
  @IsUUID()
  organizerId?: string;

  @ApiPropertyOptional({ description: 'Invited participants (names / emails)' })
  @IsOptional()
  @IsString()
  participants?: string;

  @ApiPropertyOptional({ description: 'Meeting agenda' })
  @IsOptional()
  @IsString()
  agenda?: string;

  @ApiPropertyOptional({ description: 'Why the meeting is being conducted' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateZoomMeetingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ description: 'Reschedule to a new time (ISO)' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  @Type(() => Number)
  durationMins?: number;

  @ApiPropertyOptional({ enum: ZoomMeetingStatus })
  @IsOptional()
  @IsEnum(ZoomMeetingStatus)
  status?: ZoomMeetingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  joinUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  participants?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agenda?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

/** Finalize a meeting — captures the post-meeting history record. */
export class CompleteZoomMeetingDto {
  @ApiPropertyOptional({ description: 'Meeting outcome (free text / slug)' })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional({ description: 'Meeting agenda' })
  @IsOptional()
  @IsString()
  agenda?: string;

  @ApiPropertyOptional({ description: 'Why the meeting was conducted' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Discussion summary (what was discussed)' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Client feedback' })
  @IsOptional()
  @IsString()
  clientFeedback?: string;

  @ApiPropertyOptional({ description: 'Decisions made during the meeting' })
  @IsOptional()
  @IsString()
  decisions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Action items (newline-separated)' })
  @IsOptional()
  @IsString()
  actionItems?: string;

  @ApiPropertyOptional({ description: 'Follow-up / next meeting time (ISO)' })
  @IsOptional()
  @IsDateString()
  followUpAt?: string;
}

export class ZoomQueryDto {
  @ApiPropertyOptional({ enum: ZoomMeetingStatus })
  @IsOptional()
  @IsEnum(ZoomMeetingStatus)
  status?: ZoomMeetingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({ description: 'From date (ISO)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'To date (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Search by client/business name' })
  @IsOptional()
  @IsString()
  q?: string;
}
