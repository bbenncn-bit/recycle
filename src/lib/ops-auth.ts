import * as bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export const OPS_SESSION_COOKIE = 'ops_session';

function jwtSecretBytes(): Uint8Array {
  const s = process.env.OPS_JWT_SECRET?.trim();
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('OPS_JWT_SECRET is required in production');
    }
    return new TextEncoder().encode('ops-dev-only-change-in-env');
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type OpsJwtPayload = {
  sub: string;
  username: string;
};

export async function signOpsSessionToken(userId: number, username: string): Promise<string> {
  const secret = jwtSecretBytes();
  return new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyOpsSessionToken(token: string): Promise<OpsJwtPayload | null> {
  try {
    const secret = jwtSecretBytes();
    const { payload } = await jwtVerify(token, secret);
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const username =
      typeof payload.username === 'string' ? payload.username : '';
    if (!sub || !username) return null;
    return { sub, username };
  } catch {
    return null;
  }
}

/** 从 fetch Request 读取 Cookie（中间件 / Route） */
export function getOpsSessionTokenFromRequest(request: Request): string | null {
  const raw = request.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === OPS_SESSION_COOKIE && rest.length) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export async function verifyOpsSessionFromRequest(request: Request): Promise<OpsJwtPayload | null> {
  const token = getOpsSessionTokenFromRequest(request);
  if (!token) return null;
  return verifyOpsSessionToken(token);
}
