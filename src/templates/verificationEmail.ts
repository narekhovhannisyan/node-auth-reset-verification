export const verificationEmail = ({
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
    subject: "Verify your email address",
    text: `Hi ${name},

Please verify your email by opening this link:
${url}

This link expires at ${expires}.

If you didn't create this account, you can ignore this email.`,
    html: `<html><body style="font-family:Arial,sans-serif;color:#222">
      <h2>Verify your email</h2>
      <p>Hi ${name},</p>
      <p>Thanks for registering. Click the button below to verify your email address.</p>
      <p><a href="${url}" style="background:#2563eb;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Verify Email</a></p>
      <p style="font-size:14px;color:#555">This link expires at <strong>${expires}</strong>.</p>
      <p style="font-size:14px;color:#555">If you didn't create this account, you can ignore this email.</p>
    </body></html>`,
  };
};
