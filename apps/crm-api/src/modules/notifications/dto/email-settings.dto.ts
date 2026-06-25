import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsOptional, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Per-notification-type email toggles (req 7). */
export class EmailTypeTogglesDto {
  @ApiPropertyOptional({ description: 'Upcoming callback reminder (1 day before)' })
  @IsOptional()
  @IsBoolean()
  callback_reminder?: boolean;

  @ApiPropertyOptional({ description: 'Callback due today / now' })
  @IsOptional()
  @IsBoolean()
  callback_due?: boolean;

  @ApiPropertyOptional({ description: 'Missed callback notification' })
  @IsOptional()
  @IsBoolean()
  callback_missed?: boolean;
}

export class UpdateEmailSettingsDto {
  @ApiPropertyOptional({ type: [String], description: 'Configurable distribution list for callback emails' })
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  recipients: string[] = [];

  @ApiPropertyOptional({ type: EmailTypeTogglesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailTypeTogglesDto)
  types?: EmailTypeTogglesDto;
}
