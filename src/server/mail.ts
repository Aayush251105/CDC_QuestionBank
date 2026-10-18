import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// The only place the app sends email (CLAUDE.md 2a.11): reminders to
// shortlisted students to share their questions, sent from the CDC's Gmail
// with an app password. Never used for review outcomes (2a.2).

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

export const mailEnabled = Boolean(user && pass);
export const mailFrom = user ?? null;

let transport: Transporter | null = null;

// One email to the CDC's own address with the students in BCC, so no
// student sees another's address.
export async function sendBcc(mail: {
  bcc: string[];
  subject: string;
  text: string;
}) {
  if (!user || !pass)
    throw new Error("Gmail is not set up (GMAIL_USER, GMAIL_APP_PASSWORD)");
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  await transport.sendMail({
    from: {
      name: process.env.MAIL_FROM_NAME || "CDC Placement Question Bank",
      address: user,
    },
    to: user,
    bcc: mail.bcc,
    subject: mail.subject,
    text: mail.text,
  });
}
