import { SignJWT, jwtVerify } from 'jose';
import { UserRole } from '@/types';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

const COOKIE_NAME = 'auth_token';

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'it-service-jwt-token-secret-production';
  return new TextEncoder().encode(secret);
}

/**
 * Sign a new JWT session token.
 */
export async function signJWT(payload: TokenPayload, expiresIn: string = '7d'): Promise<string> {
  const secret = getJwtSecretKey();
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verify and decode a JWT session token. Returns payload or null if invalid/expired.
 */
export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
