import { EscalationMethod } from '@prisma/client';

export interface OutboundMessage {
  to: string;
  method: EscalationMethod;
  userName: string;
}

export interface SmsClient {
  send(msg: OutboundMessage): Promise<void>;
}

export class TwilioSmsClient implements SmsClient {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async send(msg: OutboundMessage): Promise<void> {
    if (msg.method !== 'sms') {
      throw new Error(`TwilioSmsClient only handles sms; got ${msg.method}`);
    }

    const body = `DoingOK wellness alert: ${msg.userName} has not completed their daily check-in. Please reach out to confirm they are safe.`;

    const params = new URLSearchParams({
      To: msg.to,
      From: this.fromNumber,
      Body: body,
    });

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Twilio error ${response.status}: ${text}`);
    }
  }
}

export class ConsoleSmsClient implements SmsClient {
  async send(msg: OutboundMessage): Promise<void> {
    console.log(
      `[sms:console] would send ${msg.method} to ${msg.to} for user "${msg.userName}"`
    );
  }
}

export function createSmsClient(): SmsClient {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && fromNumber) {
    return new TwilioSmsClient(accountSid, authToken, fromNumber);
  }

  return new ConsoleSmsClient();
}
