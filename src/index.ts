import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { logger } from './logger';
import { generatePassHandler } from './routes/generate-pass';
import { apiKeyAuth } from './middleware/auth';
import { validateConfig, getConfig } from './config';

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// Validate config on startup
validateConfig();

// Security
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/generate-pass', limiter);

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Certificate diagnostics (auth required)
app.get('/debug-certs', apiKeyAuth, (_req, res) => {
  try {
    const config = getConfig();
    
    const certInfo = (pem: string, name: string) => {
      if (!pem) return { name, status: 'NOT_SET' };
      try {
        const cert = new crypto.X509Certificate(pem);
        return {
          name,
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.validFrom,
          validTo: cert.validTo,
          serialNumber: cert.serialNumber,
        };
      } catch (e: any) {
        return { name, status: 'PARSE_ERROR', error: e.message, pemPreview: pem.substring(0, 80) };
      }
    };

    res.json({
      timestamp: new Date().toISOString(),
      passTypeId: config.passTypeId,
      teamId: config.teamId,
      signerCert: certInfo(config.passCert, 'signerCert'),
      wwdrCert: certInfo(config.wwdrCert, 'wwdrCert'),
      hasSignerKey: !!config.passKey,
      hasPassphrase: !!config.passKeyPassphrase,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Pass generation endpoint (auth required)
app.post('/generate-pass', apiKeyAuth, generatePassHandler);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Apple Pass Signing Service running on port ${PORT}`);
});

export default app;
