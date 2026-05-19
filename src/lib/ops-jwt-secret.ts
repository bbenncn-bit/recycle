import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

let cachedSecretBytes: Uint8Array | null = null;

const DEV_FALLBACK = 'ops-dev-only-change-in-env';

function projectRoot(): string {
  const fromEnv = process.env.OPS_PROJECT_ROOT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const cwd = process.cwd();
  if (cwd.includes(`${path.sep}.next${path.sep}standalone`)) {
    const up = path.join(cwd, '..', '..');
    if (existsSync(path.join(up, 'package.json'))) return up;
  }
  return cwd;
}

function secretFilePath(): string {
  const custom = process.env.OPS_JWT_SECRET_FILE?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(projectRoot(), custom);
  return path.join(projectRoot(), '.ops-jwt-secret');
}

function readSecretFile(): string | null {
  const file = secretFilePath();
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8').trim();
  return text || null;
}

function writeSecretFile(secret: string): void {
  const file = secretFilePath();
  const dir = path.dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(file, secret, { encoding: 'utf8', mode: 0o600 });
}

/** 内网 HTTP 部署（Win10 + IP 访问）时 Cookie 不设 Secure */
export function opsSessionCookieSecure(request?: Request): boolean {
  if (process.env.OPS_ALLOW_HTTP === '1') return false;
  if (request) {
    const proto = (request.headers.get('x-forwarded-proto') || '').toLowerCase();
    if (proto === 'https') return true;
    if (proto === 'http') return false;
    const host = (request.headers.get('host') || '').split(':')[0];
    if (isPrivateOrLocalHost(host)) return false;
  }
  return process.env.NODE_ENV === 'production';
}

export function isPrivateOrLocalHost(host: string): boolean {
  const h = (host || '').trim().toLowerCase();
  if (!h || h === 'localhost') return true;
  if (h.startsWith('127.')) return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('192.168.')) return true;
  const m = /^172\.(\d+)\./.exec(h);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

/** 生产环境跳过强制 HTTPS（内网 IP / localhost） */
export function shouldSkipHttpsRedirect(host: string | null): boolean {
  if (process.env.OPS_ALLOW_HTTP === '1') return true;
  return isPrivateOrLocalHost((host || '').split(':')[0]);
}

/**
 * 运维 JWT 密钥：优先 OPS_JWT_SECRET → 项目根 .ops-jwt-secret → 生产自动生成并落盘。
 */
export function getOpsJwtSecretBytes(): Uint8Array {
  if (cachedSecretBytes) return cachedSecretBytes;

  const fromEnv = process.env.OPS_JWT_SECRET?.trim();
  if (fromEnv) {
    cachedSecretBytes = new TextEncoder().encode(fromEnv);
    return cachedSecretBytes;
  }

  const fromFile = readSecretFile();
  if (fromFile) {
    cachedSecretBytes = new TextEncoder().encode(fromFile);
    return cachedSecretBytes;
  }

  if (process.env.NODE_ENV === 'production') {
    const generated = randomBytes(32).toString('hex');
    try {
      writeSecretFile(generated);
      console.warn(
        `[ops-auth] 未配置 OPS_JWT_SECRET，已在 ${secretFilePath()} 自动生成密钥。建议在 .env.production 设置 OPS_JWT_SECRET 并备份。`,
      );
    } catch (e) {
      console.error('[ops-auth] 无法写入 .ops-jwt-secret，使用本次进程随机密钥（重启后需重新登录）', e);
    }
    cachedSecretBytes = new TextEncoder().encode(generated);
    return cachedSecretBytes;
  }

  cachedSecretBytes = new TextEncoder().encode(DEV_FALLBACK);
  return cachedSecretBytes;
}
