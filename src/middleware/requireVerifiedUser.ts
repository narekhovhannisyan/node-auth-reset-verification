import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

export const requireVerifiedUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.header("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;
    const token = bearerToken ?? req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as { sub?: string };
    if (!payload.sub) {
      return res.status(401).json({ message: "Invalid authentication token." });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }
    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        message: "Please verify your email before accessing protected resources.",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid authentication token." });
  }
};
