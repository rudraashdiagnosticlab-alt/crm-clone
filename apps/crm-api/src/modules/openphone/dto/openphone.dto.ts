import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({ description: 'OpenPhone number or id to send from' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'Recipient phone number (E.164)' })
  @IsString()
  to: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  content: string;
}
