import type { NextApiRequest, NextApiResponse, GetServerSidePropsContext } from 'next';
import crypto from 'crypto';
import { serialize } from 'cookie';
import { pool } from './db';

const COOKIE_NAME = 'admin_session';
const SESSION_DAYS = 7;

export interface AdminSession {
  id: number;
  username: string;
}

function secret(): string {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
  return process.env.SESSION_SECRET;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken(admin: AdminSession): string {
  const payload = Buffer.from(
    JSON.stringify({ id: admin.id, username: admin.username, exp: Date.now() + SESSION_DAYS * 86400_000 })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof data.id !== 'number' || !data.username || Date.now() > data.exp) return null;
    return { id: data.id, username: data.username };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, maxAge = SESSION_DAYS * 86400): string {
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  });
}

export function clearSessionCookie(): string {
  return sessionCookie('', 0);
}

export function getAdmin(req: { cookies: Partial<Record<string, string>> }): AdminSession | null {
  return verifySessionToken(req.cookies[COOKIE_NAME]);
}

type Handler = (req: NextApiRequest, res: NextApiResponse, admin: AdminSession) => void | Promise<void>;

export function withAdmin(handler: Handler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const admin = getAdmin(req);
    if (!admin) return res.status(401).json({ error: 'No autorizado' });
    return handler(req, res, admin);
  };
}

// For getServerSideProps: redirects to login, or passes { admin } as props
export async function requireAdminSSR(ctx: GetServerSidePropsContext) {
  const admin = getAdmin(ctx.req);
  if (!admin) {
    const next = encodeURIComponent(ctx.resolvedUrl);
    return { redirect: { destination: `/admin/login?next=${next}`, permanent: false as const } };
  }
  return { props: { admin } };
}

export async function audit(
  adminId: number,
  action: string,
  entityType: string | null = null,
  entityId: number | null = null,
  details: object | null = null
) {
  await pool.query(
    'INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
    [adminId, action, entityType, entityId, details ? JSON.stringify(details) : null]
  );
}
