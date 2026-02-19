import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config';
import { logger } from '../logger';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const config = getConfig();

  if (!config.apiKey) {
    logger.warn('API_KEY not configured – rejecting request');
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  if (!apiKey || apiKey !== config.apiKey) {
    logger.warn({ ip: req.ip }, 'Unauthorized request');
    res.status(401).json({ error: 'Unauthorized – provide valid X-API-Key header' });
    return;
  }

  next();
}
