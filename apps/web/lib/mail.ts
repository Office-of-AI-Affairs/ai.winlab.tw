import "server-only";
import { createTransport, type Transporter } from "nodemailer";

// Mail goes out through the Google Workspace mailbox SMTP_USER, as the
// alias MAIL_FROM (noreply@winlab.tw), the same sender Supabase used.
let transport: Transporter | null = null;

export async function sendMail(mail: { to: string; subject: string; html: string; text: string }) {
  transport ??= createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    socketTimeout: 20_000,
  });
  // A dev or test deployment sends every mail to MAIL_REDIRECT_TO alone.
  const redirect = process.env.MAIL_REDIRECT_TO;
  await transport.sendMail({
    from: process.env.MAIL_FROM,
    to: redirect || mail.to,
    subject: redirect ? `[dev → ${mail.to}] ${mail.subject}` : mail.subject,
    html: mail.html,
    text: mail.text,
  });
}
