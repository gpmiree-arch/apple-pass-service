import { PKPass } from 'passkit-generator';
import { getConfig } from './config';
import { logger } from './logger';
import type { z } from 'zod';
import type { CardSchema, CampaignSchema, TemplateSchema } from './schemas';

type Card = z.infer<typeof CardSchema>;
type Campaign = z.infer<typeof CampaignSchema>;
type Template = z.infer<typeof TemplateSchema>;

export async function createPkPass(
  card: Card,
  campaign: NonNullable<Campaign> | null,
  template: NonNullable<Template> | null,
): Promise<Buffer> {
  const config = getConfig();

  const signerCert = config.passCert;
  const signerKey = config.passKey;
  const wwdr = config.wwdrCert;

  if (!signerCert || !signerKey || !wwdr) {
    throw new Error('Apple certificates not configured');
  }

  const bgColor = template?.background_color || campaign?.brand_color || '#000000';
  const textColor = template?.text_color || '#FFFFFF';
  const accentColor = template?.accent_color || campaign?.brand_color || '#E50914';
  const storeName = sanitize(template?.store_name || campaign?.campaign_name || 'Store', 50);
  const rewardText = sanitize(template?.reward_text || campaign?.reward_text || 'Belohnung', 100);
  const stampGoal = campaign?.stamp_goal || 10;
  const customerName = sanitize(card.customer_name, 50) || 'Kunde';
  const stampCount = card.stamp_count || 0;
  const serialNumber = `LC-${card.id.replace(/-/g, '').substring(0, 22)}`;

  const pass = new PKPass(
    {},
    {
      wwdr,
      signerCert,
      signerKey,
      signerKeyPassphrase: config.passKeyPassphrase || undefined,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: config.passTypeId,
      serialNumber,
      teamIdentifier: config.teamId,
      organizationName: storeName,
      description: `${storeName} Treuekarte`,
      backgroundColor: hexToRGB(bgColor),
      foregroundColor: hexToRGB(textColor),
      labelColor: hexToRGB(accentColor),
      logoText: storeName,
    },
  );

  pass.setBarcodes({
    message: card.qr_code_data || 'NO_DATA',
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
  });

  pass.type = 'storeCard';

  pass.headerFields.push({
    key: 'stamps',
    label: 'STEMPEL',
    value: `${stampCount}/${stampGoal}`,
  });

  pass.primaryFields.push({
    key: 'reward',
    label: 'BELOHNUNG',
    value: rewardText,
  });

  pass.secondaryFields.push({
    key: 'customer',
    label: 'KUNDE',
    value: customerName,
  });

  pass.backFields.push(
    {
      key: 'terms',
      label: 'Teilnahmebedingungen',
      value: `Sammle ${stampGoal} Stempel und erhalte: ${rewardText}`,
    },
    {
      key: 'info',
      label: 'Kartennummer',
      value: serialNumber,
    },
  );

  const iconColor = parseHexColor(bgColor === '#000000' ? '#333333' : bgColor);
  pass.addBuffer('icon.png', createSolidPNG(29, 29, iconColor));
  pass.addBuffer('icon@2x.png', createSolidPNG(58, 58, iconColor));
  pass.addBuffer('icon@3x.png', createSolidPNG(87, 87, iconColor));

  if (template?.logo_url) {
    try {
      const logoData = await fetchImage(template.logo_url);
      if (logoData) {
        pass.addBuffer('logo.png', logoData);
        pass.addBuffer('logo@2x.png', logoData);
      }
    } catch (e) {
      logger.warn({ url: template.logo_url }, 'Failed to fetch logo');
    }
  }

  if (template?.background_image_url) {
    try {
      const stripData = await fetchImage(template.background_image_url);
      if (stripData) {
        pass.addBuffer('strip.png', stripData);
        pass.addBuffer('strip@2x.png', stripData);
      }
    } catch (e) {
      logger.warn({ url: template.background_image_url }, 'Failed to fetch strip image');
    }
  }

  const buffer = pass.getAsBuffer();
  return buffer;
}

function sanitize(text: string | null | undefined, max: number): string {
  if (!text) return '';
  return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().substring(0, max);
}

function hexToRGB(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return 'rgb(0,0,0)';
  return `rgb(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)})`;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 51, g: 51, b: 51 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function createSolidPNG(w: number, h: number, c: { r: number; g: number; b: number }): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const rowSize = 1 + w * 3;
  const raw = Buffer.alloc(rowSize * h);
  for (let y = 0; y < h; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * rowSize + 1 + x * 3;
      raw[o] = c.r;
      raw[o + 1] = c.g;
      raw[o + 2] = c.b;
    }
  }
  const deflated = zlibStoreCompress(raw);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflated),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function zlibStoreCompress(data: Buffer): Buffer {
  const blocks: Buffer[] = [Buffer.from([0x78, 0x01])];
  let offset = 0;
  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(65535, remaining);
    const isFinal = offset + blockSize >= data.length;
    const header = Buffer.alloc(5);
    header[0] = isFinal ? 1 : 0;
    header.writeUInt16LE(blockSize, 1);
    header.writeUInt16LE(~blockSize & 0xffff, 3);
    blocks.push(header, data.subarray(offset, offset + blockSize));
    offset += blockSize;
  }
  const adler = adler32(data);
  const adlerBuf = Buffer.alloc(4);
  adlerBuf.writeUInt32BE(adler, 0);
  blocks.push(adlerBuf);
  return Buffer.concat(blocks);
}

function adler32(data: Buffer): number {
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

let _crcTable: Uint32Array | null = null;
function crc32(data: Buffer): number {
  if (!_crcTable) {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    _crcTable = t;
  }
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = _crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) return null;
    return buf;
  } catch {
    return null;
  }
}
