import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Role } from '@crm/database';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'caller11@crm.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role, example: Role.employee })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ example: '+15551234567', description: 'OpenPhone number this caller sends SMS / dials from (E.164)' })
  @IsOptional()
  @IsString()
  openphoneNumber?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '09:00', description: 'Shift start (HH:mm); enables no-login auto-reassignment' })
  @IsOptional()
  @IsString()
  shiftStart?: string;
}

export class ListUsersQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
