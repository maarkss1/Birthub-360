import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';
import { getDatabase } from './server/db';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Render fica atrás de um proxy reverso: sem isso, req.ip sempre resolve para o
  // IP do proxy e o rate limiting por IP acaba agrupando todo mundo no mesmo balde.
  app.set('trust proxy', 1);

  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize Postgres (Supabase) database
  try {
    const db = await getDatabase();

    console.log('⚡ Banco de dados relacional Postgres (Supabase/Atlas) inicializado com sucesso.');

    // Background Task: Check for stale leads every hour
    setInterval(async () => {
      try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

        const staleLeadsRes = await db.exec(`
          SELECT id, tags, assigned_to, name
          FROM leads
          WHERE stage = 'contatado'
          AND created_at < '${threeDaysAgo}'
          AND tags NOT LIKE '%Requires Attention%'
        `);

        if (staleLeadsRes.length > 0 && staleLeadsRes[0].values) {
          for (const row of staleLeadsRes[0].values) {
            const id = row[0] as string;
            let tags = [];
            try {
              tags = JSON.parse((row[1] as string) || '[]');
            } catch(e) {}

            if (!tags.includes('Requires Attention')) {
              tags.push('Requires Attention');
              await db.run(`UPDATE leads SET tags = ? WHERE id = ?`, [JSON.stringify(tags), id]);

              // Automated Notification Log
              console.log(`[ALERTA AUTOMÁTICO] Lead ${row[3]} ("${id}") parado em Contato há +3 dias! Notificando SDR: ${row[2] || 'Geral'}`);
            }
          }
        }
      } catch (err) {
        console.error('Erro na task de background de leads parados:', err);
      }
    }, 60 * 60 * 1000); // 1 hour interval

  } catch (err) {
    console.error('Erro ao inicializar Postgres:', err);
  }

  // Mount API routes FIRST
  app.use('/api', apiRouter);

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Atlas Outbound AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
