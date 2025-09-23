import nodemailer from 'nodemailer';
import prisma from './prisma.js';
import { decrypt } from './encryption.js';

export async function sendEmail({ to, subject, text, html }) {
  try {
    // Fetch SMTP settings from PlatformSettings
    const settings = await prisma.platformSettings.findFirst();
    if (!settings) {
      throw new Error('Platform settings not found');
    }

    const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure, fromEmail, fromName } = settings;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !fromEmail) {
      console.warn('SMTP configuration incomplete, skipping email send');
      return { messageId: 'skipped' };
    }

    // Decrypt the password
    const decryptedPassword = decrypt(smtpPassword);

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure || false, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: decryptedPassword,
      },
    });

    // Send email
    const mailOptions = {
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}