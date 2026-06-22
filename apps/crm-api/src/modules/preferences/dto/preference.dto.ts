import { Allow, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPreferenceDto {
  @ApiProperty({ description: 'Preference key, e.g. "cols:leads"' })
  @IsString()
  @MaxLength(120)
  key: string;

  @ApiProperty({ description: 'Arbitrary JSON value for the preference' })
  @Allow()
  value: unknown;
}
