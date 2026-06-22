import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Timezone, LeadStatus } from '@crm/database';

export class CreateLeadDto {
  @ApiPropertyOptional({ description: 'External lead id; auto-generated if omitted (IMP-006)' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  businessName: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiPropertyOptional({ enum: Timezone, default: Timezone.EST })
  @IsOptional()
  @IsEnum(Timezone)
  timezone?: Timezone;

  @ApiPropertyOptional({ enum: LeadStatus, default: LeadStatus.new })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  // ── Lead sheet fields ──
  @ApiPropertyOptional({ description: 'NAME — contact person at the company' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: "TITLE — contact's job title" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vlc?: string;

  @ApiPropertyOptional({ description: 'Employee Code' })
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ description: 'LEAD CATEGORY' })
  @IsOptional()
  @IsString()
  leadCategory?: string;

  @ApiPropertyOptional({ description: 'NEXT FOLLOW UP DATE (ISO string)' })
  @IsOptional()
  @IsString()
  nextFollowUpDate?: string;

  @ApiPropertyOptional({ description: 'CALLER — resolved to a user by name or email' })
  @IsOptional()
  @IsString()
  caller?: string;
}

/** IMP-001/005 — bulk import. Rows are validated per-row in the service so a
 * single bad row never rejects the whole file; errors are returned per row. */
export class ImportLeadsDto {
  @ApiProperty({ type: [CreateLeadDto], description: 'Parsed rows from the uploaded Excel/CSV' })
  @IsArray()
  @ArrayNotEmpty()
  rows: CreateLeadDto[];
}

export class ListLeadsQueryDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;
}
