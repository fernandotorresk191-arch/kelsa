/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SmsSendResult {
  success: boolean;
  code?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiUrl = 'https://apiagent.ru/password_generation/api.php';

  constructor(private readonly config: ConfigService) {}

  /**
   * Отправка СМС с одноразовым кодом через TargetSMS API.
   * API генерирует код самостоятельно и возвращает его в ответе.
   */
  async sendCode(phone: string, codeLength = 4): Promise<SmsSendResult> {
    const login = this.config.get<string>('SMS_LOGIN') ?? 'shatoidil';
    const password = this.config.get<string>('SMS_PASSWORD') ?? '84Power84';
    const sender = this.config.get<string>('SMS_SENDER') ?? 'kelsa.store';

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<request>
  <security>
    <login>${this.escapeXml(login)}</login>
    <password>${this.escapeXml(password)}</password>
  </security>
  <phone>${this.escapeXml(phone)}</phone>
  <sender>${this.escapeXml(sender)}</sender>
  <random_string_len>${codeLength}</random_string_len>
  <text>Код для входа на kelsa.store: {код}</text>
</request>`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        body: xml,
      });

      const text = await response.text();
      this.logger.log(`SMS API response for ${phone}: ${text}`);

      // Parse success: <success code="1234" .../>
      const codeMatch = text.match(/code="(\d+)"/);
      if (codeMatch) {
        return { success: true, code: codeMatch[1] };
      }

      // Parse error: <error>...</error>
      const errorMatch = text.match(/<error>(.*?)<\/error>/);
      if (errorMatch) {
        this.logger.error(`SMS API error: ${errorMatch[1]}`);
        return { success: false, error: errorMatch[1] };
      }

      this.logger.error(`SMS API unexpected response: ${text}`);
      return { success: false, error: 'Неожиданный ответ от SMS-сервиса' };
    } catch (err) {
      this.logger.error(`SMS API request failed: ${err}`);
      return { success: false, error: 'Ошибка отправки SMS' };
    }
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
