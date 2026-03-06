import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

interface DeliverPhoneVerificationCodeInput {
  phoneE164: string;
  code: string;
  ttlSeconds: number;
}

const sanitizePhoneForLogs = (phoneE164: string): string => {
  if (phoneE164.length <= 4) {
    return phoneE164;
  }

  const visibleSuffix = phoneE164.slice(-4);
  return `***${visibleSuffix}`;
};

const renderSmsTemplate = (
  template: string,
  input: { code: string; ttlSeconds: number; phoneE164: string },
): string => {
  const ttlMinutes = Math.max(1, Math.ceil(input.ttlSeconds / 60));
  return template
    .replaceAll('{{code}}', input.code)
    .replaceAll('{{ttl_seconds}}', input.ttlSeconds.toString())
    .replaceAll('{{ttl_minutes}}', ttlMinutes.toString())
    .replaceAll('{{phone_e164}}', input.phoneE164);
};

@Injectable()
export class AuthPhoneVerificationDeliveryService {
  private readonly env = loadApiEnv();
  private readonly logger = new Logger(AuthPhoneVerificationDeliveryService.name);

  async deliverPhoneVerificationCode(input: DeliverPhoneVerificationCodeInput): Promise<void> {
    if (this.env.PHONE_VERIFICATION_DELIVERY_PROVIDER === 'twilio') {
      await this.deliverWithTwilio(input);
      return;
    }

    if (this.env.PHONE_VERIFICATION_DELIVERY_PROVIDER === 'webhook') {
      await this.deliverWithWebhook(input);
      return;
    }

    await this.deliverWithConsole(input);
  }

  private async deliverWithConsole(input: DeliverPhoneVerificationCodeInput): Promise<void> {
    if (this.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(
        'Phone verification delivery provider is not configured for production.',
      );
    }

    const message = renderSmsTemplate(this.env.PHONE_VERIFICATION_SMS_TEMPLATE, {
      code: input.code,
      ttlSeconds: input.ttlSeconds,
      phoneE164: input.phoneE164,
    });

    this.logger.log(
      `Phone OTP delivery (console) -> ${sanitizePhoneForLogs(input.phoneE164)} | ${message}`,
    );
  }

  private async deliverWithWebhook(input: DeliverPhoneVerificationCodeInput): Promise<void> {
    const webhookUrl = this.env.PHONE_VERIFICATION_DELIVERY_WEBHOOK_URL.trim();
    if (!webhookUrl) {
      throw new ServiceUnavailableException(
        'Phone verification delivery webhook URL is not configured.',
      );
    }

    const message = renderSmsTemplate(this.env.PHONE_VERIFICATION_SMS_TEMPLATE, {
      code: input.code,
      ttlSeconds: input.ttlSeconds,
      phoneE164: input.phoneE164,
    });

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    const authToken = this.env.PHONE_VERIFICATION_DELIVERY_WEBHOOK_AUTH_TOKEN.trim();
    if (authToken) {
      headers.authorization = `Bearer ${authToken}`;
    }

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: 'sms',
          eventType: 'phone_verification_otp',
          phoneE164: input.phoneE164,
          message,
          code: input.code,
          ttlSeconds: input.ttlSeconds,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(this.env.PHONE_VERIFICATION_DELIVERY_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException('Phone verification delivery provider unavailable.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Phone verification delivery provider unavailable.');
    }
  }

  private async deliverWithTwilio(input: DeliverPhoneVerificationCodeInput): Promise<void> {
    const accountSid = this.env.PHONE_VERIFICATION_TWILIO_ACCOUNT_SID.trim();
    const authToken = this.env.PHONE_VERIFICATION_TWILIO_AUTH_TOKEN.trim();
    if (!accountSid || !authToken) {
      throw new ServiceUnavailableException(
        'Phone verification delivery provider is not configured.',
      );
    }

    const fromNumber = this.env.PHONE_VERIFICATION_TWILIO_FROM_NUMBER.trim();
    const messagingServiceSid = this.env.PHONE_VERIFICATION_TWILIO_MESSAGING_SERVICE_SID.trim();
    if (!fromNumber && !messagingServiceSid) {
      throw new ServiceUnavailableException(
        'Phone verification delivery provider is not configured.',
      );
    }

    const message = renderSmsTemplate(this.env.PHONE_VERIFICATION_SMS_TEMPLATE, {
      code: input.code,
      ttlSeconds: input.ttlSeconds,
      phoneE164: input.phoneE164,
    });

    const body = new URLSearchParams();
    body.set('To', input.phoneE164);
    body.set('Body', message);
    if (messagingServiceSid) {
      body.set('MessagingServiceSid', messagingServiceSid);
    } else {
      body.set('From', fromNumber);
    }

    const encodedAuth = Buffer.from(`${accountSid}:${authToken}`, 'utf8').toString('base64');

    let response: Response;
    try {
      response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            authorization: `Basic ${encodedAuth}`,
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body: body.toString(),
          cache: 'no-store',
          signal: AbortSignal.timeout(this.env.PHONE_VERIFICATION_DELIVERY_TIMEOUT_MS),
        },
      );
    } catch {
      throw new ServiceUnavailableException('Phone verification delivery provider unavailable.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Phone verification delivery provider unavailable.');
    }
  }
}
