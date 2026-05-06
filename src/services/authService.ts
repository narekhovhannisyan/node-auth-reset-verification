import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TokenType } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { resetEmail } from "../templates/resetEmail";
import { verificationEmail } from "../templates/verificationEmail";
import { send } from "./mailService";
import { consume, issue, validateSignature } from "./tokenService";

/**
 * Builds a signed email verification URL.
 */
function buildVerifyUrl(params: {
  userId: string;
  token: string;
  sig: string;
  exp: number;
}) {
  return `${env.APP_BASE_URL}/auth/verify-email?userId=${encodeURIComponent(params.userId)}&token=${encodeURIComponent(params.token)}&sig=${encodeURIComponent(params.sig)}&exp=${params.exp}`;
}

/**
 * Builds a signed password reset URL.
 */
function buildResetUrl(params: {
  userId: string;
  token: string;
  sig: string;
  exp: number;
}) {
  return `${env.APP_BASE_URL}/auth/reset-password/confirm?userId=${encodeURIComponent(params.userId)}&token=${encodeURIComponent(params.token)}&sig=${encodeURIComponent(params.sig)}&exp=${params.exp}`;
}

/**
 * Registers a new user and sends verification email.
 */
export async function register(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
    },
  });

  const tokenData = await issue(user.id, TokenType.verify);
  const verifyUrl = buildVerifyUrl({
    userId: user.id,
    token: tokenData.token,
    sig: tokenData.sig,
    exp: tokenData.exp,
  });

  const email = verificationEmail({
    name: user.name,
    url: verifyUrl,
    expiresAt: tokenData.expiresAt,
  });

  await send({
    to: user.email,
    subject: email.subject,
    text: email.text,
    html: email.html,
    category: "email-verification",
  });

  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Authenticates a user and issues a JWT.
 */
export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (!user) {
    throw new Error("Invalid email or password.");
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password.");
  }
  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
  return { token, user };
}

/**
 * Verifies a user's email from a signed link token.
 */
export async function verifyEmail(input: {
  userId: string;
  token: string;
  sig: string;
  exp: number;
}) {
  validateSignature(
    input.token,
    input.sig,
    input.userId,
    TokenType.verify,
    input.exp,
  );
  await consume({
    token: input.token,
    userId: input.userId,
    type: TokenType.verify,
    exp: input.exp,
  });

  await prisma.user.update({
    where: { id: input.userId },
    data: { emailVerifiedAt: new Date() },
  });
}

/**
 * Sends a password reset email when user exists.
 */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    return;
  }

  const tokenData = await issue(user.id, TokenType.reset);
  const resetUrl = buildResetUrl({
    userId: user.id,
    token: tokenData.token,
    sig: tokenData.sig,
    exp: tokenData.exp,
  });

  const emailPayload = resetEmail({
    name: user.name,
    url: resetUrl,
    expiresAt: tokenData.expiresAt,
  });

  await send({
    to: user.email,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload.html,
    category: "password-reset",
  });
}

/**
 * Resets password after signed token validation.
 */
export async function resetPassword(input: {
  userId: string;
  token: string;
  sig: string;
  exp: number;
  newPassword: string;
}) {
  validateSignature(
    input.token,
    input.sig,
    input.userId,
    TokenType.reset,
    input.exp,
  );
  await consume({
    token: input.token,
    userId: input.userId,
    type: TokenType.reset,
    exp: input.exp,
  });

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({
    where: { id: input.userId },
    data: { passwordHash },
  });
}
