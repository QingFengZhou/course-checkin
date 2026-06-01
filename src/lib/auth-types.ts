export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  } | null;
  isAuthenticated: boolean;
}

export const AUTH_COOKIE_NAME = "cc_session" as const;

export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIE,
  sameSite: "lax" as const,
  maxAge: 604800, // 7 days
  path: "/",
};
