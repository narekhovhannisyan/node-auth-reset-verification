export const resetEmail = ({
  name,
  url,
  expiresAt,
}: {
  name: string;
  url: string;
  expiresAt: Date;
}) => {
  const expires = expiresAt.toUTCString();
  return {
    subject: "Reset your password",
    text: `Hi ${name},

We received a request to reset your password.
Open this link to choose a new password:
${url}

This link expires at ${expires}.

If you didn't request a password reset, you can ignore this email.`,
    html: `<html><body style="font-family:Arial,sans-serif;color:#222">
      <h2>Reset your password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click below to set a new one.</p>
      <p><a href="${url}" style="background:#16a34a;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Reset Password</a></p>
      <p style="font-size:14px;color:#555">This link expires at <strong>${expires}</strong>.</p>
      <p style="font-size:14px;color:#555">If you didn't request this, you can ignore this email.</p>
    </body></html>`,
  };
};
