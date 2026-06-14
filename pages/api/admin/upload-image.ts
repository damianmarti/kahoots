import type { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { getAdmin } from '../../../lib/auth';

const upload = multer({ dest: '/tmp', limits: { fileSize: 4 * 1024 * 1024 } });

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  onError(error, req, res) {
    res.status(501).json({ error: `Sorry, something went wrong! ${error.message}` });
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
  if (!req.file.mimetype?.startsWith('image/')) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'El archivo debe ser una imagen.' });
  }
  try {
    const ext = (req.file.originalname.match(/\.\w+$/) || ['.png'])[0];
    const blob = await put(
      `questions/${crypto.randomBytes(8).toString('hex')}${ext}`,
      fs.createReadStream(req.file.path),
      { access: 'public', contentType: req.file.mimetype }
    );
    res.status(200).json({ url: blob.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
