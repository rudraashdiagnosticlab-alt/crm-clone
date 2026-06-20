import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';

/** TOTP MFA helper (brief: Multi-Factor Authentication). otplib v13 functional API. */
@Injectable()
export class MfaService {
  generateSecret(): string {
    return generateSecret();
  }

  /** otpauth:// URI rendered as a data-URL QR for authenticator apps. */
  async buildQrCode(email: string, secret: string): Promise<string> {
    const issuer = process.env.MFA_ISSUER ?? 'CRM Lead & Sales';
    const otpauth = generateURI({ issuer, label: email, secret });
    return QRCode.toDataURL(otpauth);
  }

  verify(token: string, secret: string): boolean {
    return verifySync({ token, secret }).valid;
  }
}
