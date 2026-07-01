import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({ description: 'Message body' })
  @IsString()
  @MinLength(1)
  @MaxLength(1600)
  body: string;

  @ApiPropertyOptional({ description: 'Send-from number (defaults to first workspace number)' })
  @IsOptional()
  @IsString()
  from?: string;
}

export class CallByPhoneDto {
  @ApiProperty({ description: 'Number to dial (E.164 or local digits) — from the dial pad' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  phone: string;
}
