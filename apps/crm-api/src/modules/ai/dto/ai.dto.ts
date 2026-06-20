import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({ example: 'What is Form 1099?' })
  @IsString()
  @MinLength(1)
  question: string;
}
