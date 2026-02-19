import { logger } from './logger';

export interface AppConfig {
  passTypeId: string;
  teamId: string;
  passCert: string;
  passKey: string;
  wwdrCert: string;
  passKeyPassphrase: string;
  apiKey: string;
}

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (_config) return _config;

  const passTypeId = process.env.APPLE_PASS_TYPE_ID || '';
  const teamId = process.env.APPLE_TEAM_ID || '';
  const apiKey = process.env.API_KEY || '';
  const passKeyPassphrase = process.env.APPLE_PASS_KEY_PASSPHRASE || '';

  const passCert = decodeBase64Env('APPLE_PASS_CERT_BASE64');
  const passKey = decodeBase64Env('APPLE_PASS_KEY_BASE64');
  const wwdrCert = decodeBase64Env('APPLE_WWDR_CERT_BASE64');

  _config = { passTypeId, teamId, passCert, passKey, wwdrCert, passKeyPassphrase, apiKey };
  return _config;
}

function decodeBase64Env(name: string): string {
  const val = process.env[name];
  if (!val) return '';
  try {
    return Buffer.from(val, 'base64').toString('utf-8');
  } catch {
    logger.warn(`Failed to decode ${name} from Base64`);
    return '';
  }
}

export function validateConfig(): void {
  const cfg = getConfig();
  const missing: string[] = [];

  if (!cfg.passTypeId) missing.push('APPLE_PASS_TYPE_ID');
  if (!cfg.teamId) missing.push('APPLE_TEAM_ID');
  if (!cfg.passCert) missing.push('APPLE_PASS_CERT_BASE64');
  if (!cfg.passKey) missing.push('APPLE_PASS_KEY_BASE64');
  if (!cfg.wwdrCert) missing.push('APPLE_WWDR_CERT_BASE64');
  if (!cfg.apiKey) missing.push('API_KEY');

  if (missing.length > 0) {
    logger.error(`Missing required env vars: ${missing.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  } else {
    logger.info('Configuration validated successfully');
  }
}
