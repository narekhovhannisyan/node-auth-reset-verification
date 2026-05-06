import crypto from "crypto";
import { TokenType } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

type SignedPayload = {
  userId: string;
  type: TokenType;
  exp: number;
};

const minutesByType: Record<TokenType, number> = {
  verify: env.VERIFY_TOKEN_TTL_MINUTES,
  reset: env.RESET_TOKEN_TTL_MINUTES,
};

export class TokenError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: "invalid" | "expired" | "used",
  ) {
    super(message);
  }
}

/**
 * Hashes a raw token before persistence or lookup.
 */
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Produces an HMAC signature for a token link payload.
 */
function createSignature(token: string, payload: SignedPayload): string {
  return crypto
    .createHmac("sha256", env.APP_SECRET)
    .update(`${token}.${payload.userId}.${payload.type}.${payload.exp}`)
    .digest("hex");
}

/**
 * Issues a new signed token pair and invalidates prior active tokens of the same type.
 */
export async function issue(userId: string, type: TokenType) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const exp = now + minutesByType[type] * 60 * 1000;
  const expiresAt = new Date(exp);
  const payload: SignedPayload = { userId, type, exp };
  const sig = createSignature(token, payload);

  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return {
    token,
    sig,
    exp,
    expiresAt,
  };
}

/**
 * Validates the HMAC signature of a token link.
 */
export function validateSignature(
  token: string,
  sig: string,
  userId: string,
  type: TokenType,
  exp: number,
) {
  const payload: SignedPayload = { userId, type, exp };
  const expected = createSignature(token, payload);
  if (sig !== expected) {
    throw new TokenError("Invalid or tampered token link.", 400, "invalid");
  }
}

/**
 * Consumes a token once after validating integrity and expiry.
 */
export async function consume(params: {
  token: string;
  userId: string;
  type: TokenType;
  exp: number;
}) {
  const { token, userId, type, exp } = params;

  if (Date.now() > exp) {
    throw new TokenError("This link has expired. Request a new link.", 410, "expired");
  }

  const tokenHash = hashToken(token);
  const record = await prisma.authToken.findFirst({
    where: { tokenHash, userId, type },
  });

  if (!record) {
    throw new TokenError("Invalid token.", 400, "invalid");
  }
  if (record.usedAt) {
    throw new TokenError("This link was already used. Request a new one.", 409, "used");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new TokenError("This link has expired. Request a new link.", 410, "expired");
  }

  await prisma.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
}

/**
 * Looks up the token record without mutating it.
 */
export async function inspect(params: {
  token: string;
  userId: string;
  type: TokenType;
}) {
  const { token, userId, type } = params;

  const tokenHash = hashToken(token);
  return prisma.authToken.findFirst({
    where: { tokenHash, userId, type },
  });
}
