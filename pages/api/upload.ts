import type { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import multer from 'multer';
import { Pool } from 'pg';
import fs from 'fs';
import csv from 'csv-parser';

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Multer setup for file upload
const upload = multer({ dest: '/tmp' });

// Helper to extract padron from player name
function extractPadron(name: string): string | null {
  // Match numbers at start, end, or before/after dash
  const match = name.match(/(\d{5,})/);
  return match ? match[1] : null;
}

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
  const { kahootName, cuatrimestre, password } = req.body;
  if (!req.file || !kahootName || !cuatrimestre || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if (password !== process.env.PASSWORD) {
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }
  try {
    const client = await pool.connect();
    try {
      const rowsToInsert: { padron: string; correct: number; incorrect: number }[] = [];
      
      // Process CSV file
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => {
            const name = row.Nombre || '';
            const padron = extractPadron(name);
            if (!padron) return;
            const correct = parseInt(row.Correctas, 10) || 0;
            const incorrect = parseInt(row.Incorrectas, 10) || 0;
            rowsToInsert.push({ padron, correct, incorrect });
          })
          .on('end', () => {
            resolve();
          })
          .on('error', (error) => {
            reject(error);
          });
      });

      for (const { padron, correct, incorrect } of rowsToInsert) {
        await client.query(
          'INSERT INTO kahoot_results (kahoot_name, cuatrimestre, padron, correct_answers, incorrect_answers) VALUES ($1, $2, $3, $4, $5)',
          [kahootName, cuatrimestre, padron, correct, incorrect]
        );
      }
    } finally {
      client.release();
      fs.unlinkSync(req.file.path);
    }
    res.status(200).json({ success: true });
  } catch (err: any) {
    if (req.file && req.file.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default apiRoute;