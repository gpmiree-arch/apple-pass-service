import { Request, Response } from 'express';
import { GeneratePassRequestSchema } from '../schemas';
import { createPkPass } from '../pass-builder';
import { logger } from '../logger';

export async function generatePassHandler(req: Request, res: Response): Promise<void> {
  const start = Date.now();

  try {
    const parsed = GeneratePassRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn({ errors: parsed.error.flatten() }, 'Invalid request body');
      res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { card, campaign, template } = parsed.data;

    logger.info({ cardId: card.id }, 'Generating Apple Wallet pass');

    const pkpassBuffer = await createPkPass(card, campaign ?? null, template ?? null);

    const elapsed = Date.now() - start;
    logger.info({ cardId: card.id, elapsed }, 'Pass generated successfully');

    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="loyalty_card.pkpass"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.send(pkpassBuffer);
  } catch (error) {
    const elapsed = Date.now() - start;
    logger.error({ error, elapsed }, 'Failed to generate pass');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error generating pass',
    });
  }
}
