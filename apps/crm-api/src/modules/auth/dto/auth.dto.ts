import { IsEmail, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@crm.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: '6-digit TOTP code (required if MFA enabled)' })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'mfaToken must be a 6-digit code' })
  mfaToken?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class VerifyMfaDto {
  @ApiProperty({ description: '6-digit TOTP code from the authenticator app' })
  @Matches(/^\d{6}$/)
  token: string;
}
