import { Injectable } from '@nestjs/common';
import { OpenPhoneClient } from './openphone.client';
import { OpenPhoneMessagePayload, OpenPhoneContactPayload } from './openphone.types';

@Injectable()
export class OpenPhoneService {
  constructor(private readonly client: OpenPhoneClient) {}

  get isSandbox() {
    return this.client.isSandbox;
  }

  /** Live connection check — verifies credentials by listing phone numbers. */
  async status() {
    const res = await this.client.listPhoneNumbers();
    return {
      provider: 'OpenPhone',
      sandbox: this.client.isSandbox,
      connected: res.success,
      phoneNumbers: res.data ?? [],
      error: res.success ? null : res.error ?? null,
    };
  }

  sendSms(payload: OpenPhoneMessagePayload) {
    return this.client.sendMessage(payload);
  }

  createContact(payload: OpenPhoneContactPayload) {
    return this.client.createContact(payload);
  }
}
