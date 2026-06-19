import type { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { getAdmin } from '../../../lib/auth';

const upload = multer({ dest: '/tmp', limits: { fileSize: 4 * 1024 * 1024 } });

// Formatos permitidos: se renderizan en <img> desde un blob público, así que
// se excluyen formatos riesgosos (p.ej. SVG, que puede ejecutar scripts).
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Verifica los magic bytes reales del archivo (el mimetype que reporta multer
// viene del cliente y es spoofeable). Devuelve el MIME detectado o null.
function detectImageType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.length >= 6 && (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a')) return 'image/gif';
  return null;
}

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  onError(error, req, res) {
    console.error('upload-image error:', error);
    res.status(500).json({ error: 'Algo salió mal al subir la imagen.' });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(upload.single('file'));

apiRoute.post(async (req: any, res) => {
  const admin = getAdmin(req);
  if (!admin) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    return res.status(401).json({ error: 'No autorizado' });
  }
  if (!req.file) return res.status(400).json({ error: 'Falta la imagen.' });
  try {
    // El formato se determina por el contenido real, no por el mimetype/extensión del cliente.
    const header = Buffer.alloc(12);
    const fd = fs.openSync(req.file.path, 'r');
    try { fs.readSync(fd, header, 0, 12, 0); } finally { fs.closeSync(fd); }
    const detected = detectImageType(header);
    const ext = detected && ALLOWED_TYPES[detected];
    if (!detected || !ext) {
      return res.status(400).json({ error: 'Formato no permitido. Usá PNG, JPG, WEBP o GIF.' });
    }
    const blob = await put(
      `questions/${crypto.randomBytes(8).toString('hex')}${ext}`,
      fs.createReadStream(req.file.path),
      { access: 'public', contentType: detected }
    );
    res.status(200).json({ url: blob.url });
  } catch (err: any) {
    console.error('upload-image error:', err);
    res.status(500).json({ error: 'Algo salió mal al subir la imagen.' });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default apiRoute;
