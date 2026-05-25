import { SignJWT, jwtVerify } from "jose";
import { NextResponse, NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, cookieConfig, type JwtPayload, type AuthSession } from "@/lib/auth-types";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as JwtPayload;
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 604800,
    path: "/",
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getAuthSession(request: NextRequest): Promise<AuthSession> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return { user: null, isAuthenticated: false };
  }
  try {
    const payload = await verifyToken(token);
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        displayName: payload.email, // Will be enriched from DB in routes
        role: payload.role,
      },
      isAuthenticated: true,
    };
  } catch {
    return { user: null, isAuthenticated: false };
  }
}
