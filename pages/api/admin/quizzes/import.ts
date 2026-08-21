import type { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import multer from 'multer';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getAdmin } from '../../../../lib/auth';
import { parseKahootWorkbook, KahootImportError } from '../../../../lib/kahoot-import';

// Límite de tamaño para evitar agotar /tmp o memoria/CPU (DoS) al leer el xlsx.
const upload = multer({ dest: '/tmp', limits: { fileSize: 10 * 1024 * 1024 } });

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  onError(error: any, req, res) {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande (máx. 10 MB).' });
    }
    console.error('quizzes/import error:', error);
    res.status(500).json({ error: 'Algo salió mal al procesar el archivo.' });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

// Autenticar ANTES de multer: así un request no autorizado se rechaza sin
// llegar a parsear ni escribir el archivo en /tmp.
apiRoute.use((req, res, next) => {
  if (!getAdmin(req)) return res.status(401).json({ error: 'No autorizado' });
  next();
});

apiRoute.use(upload.single('file'));

// Lee un export de resultados de Kahoot (.xlsx) y devuelve el cuestionario
// para precargar el editor. No guarda nada: el admin revisa y guarda desde ahí.
apiRoute.post(async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo .xlsx.' });
  try {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(req.file.path);
    } catch {
      return res.status(400).json({ error: 'No se pudo leer el archivo: ¿es un .xlsx exportado de Kahoot?' });
    }
    const fallbackName = path.parse(req.file.originalname || 'Cuestionario importado').name;
    const result = parseKahootWorkbook(workbook, fallbackName);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof KahootImportError) return res.status(400).json({ error: err.message });
    console.error('quizzes/import error:', err);
    return res.status(500).json({ error: 'Algo salió mal al procesar el archivo.' });
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
