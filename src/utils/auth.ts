import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const ACCESS_SECRET  = process.env.JWT_SECRET         || 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

export interface JWTPayload {
  userId:  string;
  shopId:  string;
  role:    string;
  email:   string;
}

export const generateTokens = (payload: JWTPayload) => ({
  accessToken:  jwt.sign(payload, ACCESS_SECRET,  { expiresIn: '15m' }),
  refreshToken: jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d'  }),
});

export const verifyAccessToken  = (t: string) => jwt.verify(t, ACCESS_SECRET)  as JWTPayload;
export const verifyRefreshToken = (t: string) => jwt.verify(t, REFRESH_SECRET) as JWTPayload;

export const hashPassword    = (pw: string) => bcrypt.hash(pw, 12);
export const comparePassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export const refreshExpiresAt = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
};
