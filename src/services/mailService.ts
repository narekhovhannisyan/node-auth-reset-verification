import { MailtrapClient } from "mailtrap";
import { env } from "../config/env";

const client = new MailtrapClient({
  token: env.MAILTRAP_API_TOKEN,
});

const sender = {
  email: env.MAIL_FROM_ADDRESS,
  name: env.MAIL_FROM_NAME,
};

/**
 * Sends a transactional email through Mailtrap.
 */
export async function send(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  category: string;
}) {
  const { to, subject, text, html, category } = params;

  await client.send({
    from: sender,
    to: [{ email: to }],
    subject,
    text,
    html,
    category,
  });
}
