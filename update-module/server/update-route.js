import fs from 'fs';

export default function updateRoute({ express, updateFile, apkDir }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    try {
      const data = JSON.parse(fs.readFileSync(updateFile, 'utf8'));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'No se pudo leer la config de actualizacion' });
    }
  });

  if (apkDir && fs.existsSync(apkDir)) {
    router.use('/apk', express.static(apkDir));
  }

  return router;
}
