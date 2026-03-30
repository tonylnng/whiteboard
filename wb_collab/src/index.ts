import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Logger } from '@hocuspocus/extension-logger';
import { Pool } from 'pg';
import * as jwt from 'jsonwebtoken';

const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'wb-postgres',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'whiteboard',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB || 'whiteboard',
});

const server = Server.configure({
  port: Number(process.env.HOCUSPOCUS_PORT) || 1234,

  extensions: [
    new Logger(),
    new Database({
      fetch: async ({ documentName }) => {
        try {
          const result = await pgPool.query(
            `SELECT yjs_state FROM board_snapshots WHERE board_id = $1 ORDER BY version DESC LIMIT 1`,
            [documentName]
          );
          return result.rows[0]?.yjs_state || null;
        } catch (e) {
          console.error('DB fetch error:', e);
          return null;
        }
      },
      store: async ({ documentName, state }) => {
        try {
          const vRes = await pgPool.query(
            `SELECT COALESCE(MAX(version), 0) as v FROM board_snapshots WHERE board_id = $1`,
            [documentName]
          );
          const nextVersion = vRes.rows[0].v + 1;
          await pgPool.query(
            `INSERT INTO board_snapshots (board_id, yjs_state, version) VALUES ($1, $2, $3)`,
            [documentName, Buffer.from(state), nextVersion]
          );
          await pgPool.query(
            `DELETE FROM board_snapshots WHERE board_id = $1 AND version < (SELECT version FROM board_snapshots WHERE board_id = $1 ORDER BY version DESC OFFSET 50 LIMIT 1)`,
            [documentName]
          );
        } catch (e) {
          console.error('DB store error:', e);
        }
      },
    }),
  ],

  async onAuthenticate({ token, documentName }) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const result = await pgPool.query(
        `SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2`,
        [documentName, payload.sub]
      );
      if (result.rows.length === 0) {
        const boardRes = await pgPool.query(`SELECT is_public FROM boards WHERE id = $1`, [documentName]);
        if (!boardRes.rows[0]?.is_public) throw new Error('Unauthorized');
        return { user: { id: payload.sub, name: payload.name, role: 'viewer' } };
      }
      return { user: { id: payload.sub, name: payload.name, role: result.rows[0].role } };
    } catch (e) {
      throw new Error('Authentication failed');
    }
  },

  async onConnect({ documentName, context }) {
    console.log(`[Collab] User ${context.user?.id} joined ${documentName}`);
  },
});

server.listen().then(() => {
  console.log(`🔄 Hocuspocus running on port ${process.env.HOCUSPOCUS_PORT || 1234}`);
});
