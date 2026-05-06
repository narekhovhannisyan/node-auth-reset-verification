import { Router } from "express";
import { z } from "zod";
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from "../services/authService";
import { inspect, TokenError, validateSignature } from "../services/tokenService";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifySchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  sig: z.string().min(1),
  exp: z.coerce.number().positive(),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = verifySchema.extend({
  newPassword: z.string().min(8),
});

router.post("/register", async (req, res) => {
  try {
    const input = registerSchema.parse(req.body);
    const user = await register(input);
    return res.status(201).json({
      message: "Registration successful. Check your email for a verification link.",
      user,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to register user.";
    return res.status(400).json({ message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);
    const { token, user } = await login(input);
    return res.json({
      message: "Login successful.",
      token,
      user: { id: user.id, email: user.email, emailVerifiedAt: user.emailVerifiedAt },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return res.status(401).json({ message });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const input = verifySchema.parse(req.query);
    await verifyEmail(input);
    return res.json({ message: "Email verified successfully." });
  } catch (error) {
    if (error instanceof TokenError) {
      return res.status(error.status).json({ message: error.message });
    }
    const message = error instanceof Error ? error.message : "Verification failed.";
    return res.status(400).json({ message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    await requestPasswordReset(email);
    return res.status(404).json({
      message:
        "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to process request.";
    return res.status(400).json({ message });
  }
});

router.get("/reset-password/confirm", async (req, res) => {
  try {
    const input = verifySchema.parse(req.query);
    validateSignature(input.token, input.sig, input.userId, "reset", input.exp);
    if (Date.now() > input.exp) {
      return res.status(410).json({
        message: "This link has expired. Request a new password reset link.",
      });
    }

    const record = await inspect({
      token: input.token,
      userId: input.userId,
      type: "reset",
    });
    if (!record) {
      return res.status(400).json({ message: "Invalid reset link." });
    }
    if (record.usedAt) {
      return res.status(409).json({
        message:
          "This reset link was already used. Request a new password reset link.",
      });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({
        message: "This link has expired. Request a new password reset link.",
      });
    }

    const form = `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;max-width:520px;margin:40px auto">
    <h2>Set a new password</h2>
    <form method="post" action="/auth/reset-password">
      <input type="hidden" name="userId" value="${input.userId}" />
      <input type="hidden" name="token" value="${input.token}" />
      <input type="hidden" name="sig" value="${input.sig}" />
      <input type="hidden" name="exp" value="${input.exp}" />
      <label>New password</label><br/>
      <input type="password" name="newPassword" minlength="8" required />
      <br/><br/>
      <button type="submit">Reset password</button>
    </form>
    <p style="color:#666;font-size:14px">If this link is invalid or expired, request a new one.</p>
  </body>
</html>`;
    return res.type("html").send(form);
  } catch (error) {
    if (error instanceof TokenError) {
      return res.status(error.status).json({ message: error.message });
    }
    return res.status(400).json({ message: "Invalid reset link." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const source = Object.keys(req.body ?? {}).length ? req.body : req.query;
    const input = resetSchema.parse(source);
    await resetPassword(input);
    return res.json({ message: "Password has been reset successfully." });
  } catch (error) {
    if (error instanceof TokenError) {
      return res.status(error.status).json({ message: error.message });
    }
    const message =
      error instanceof Error ? error.message : "Unable to reset password.";
    return res.status(400).json({ message });
  }
});

export default router;
