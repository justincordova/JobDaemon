import { Resend } from 'resend';
import { Job } from './types.js';
import { logger } from './logger.js';

/**
 * Sends an email summary of new jobs found.
 * Uses Resend API for reliable delivery.
 * @param jobs The list of new jobs to include in the email.
 */
export async function sendEmailSummary(jobs: Job[]): Promise<void> {
  if (jobs.length === 0) return;

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailTo = process.env.EMAIL_TO || 'justinavodroc@gmail.com';
  // Use a verified domain or Resend's default testing domain
  const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  if (!resendApiKey) {
    logger.warn('RESEND_API_KEY not set. Skipping email summary.');
    return;
  }

  const resend = new Resend(resendApiKey);

  const jobListHtml = jobs.map(job => `
    <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <h3 style="margin: 0 0 12px 0; color: #111111; font-size: 18px; font-weight: 600; font-family: Helvetica, Arial, sans-serif;">${job.title}</h3>
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 16px;">
        <tr>
          <td style="padding-bottom: 4px; color: #555555; font-size: 14px; width: 80px; font-weight: bold;">Company:</td>
          <td style="padding-bottom: 4px; color: #111111; font-size: 14px;">${job.company || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 4px; color: #555555; font-size: 14px; width: 80px; font-weight: bold;">Location:</td>
          <td style="padding-bottom: 4px; color: #111111; font-size: 14px;">${job.location || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 4px; color: #555555; font-size: 14px; width: 80px; font-weight: bold;">Type:</td>
          <td style="padding-bottom: 4px; color: #111111; font-size: 14px;">${job.workModel || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 4px; color: #555555; font-size: 14px; width: 80px; font-weight: bold;">Salary:</td>
          <td style="padding-bottom: 4px; color: #111111; font-size: 14px;">${job.salary || 'N/A'}</td>
        </tr>
      </table>

      <a href="${job.link}" target="_blank" style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold; text-align: center;">
        Apply Now
      </a>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Job Postings</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
            <h1 style="margin: 0; color: #111111; font-size: 24px;">JobDaemon</h1>
            <p style="margin: 8px 0 0 0; color: #666666; font-size: 16px;">${jobs.length} new opportunities found</p>
          </div>

          <!-- Job List -->
          ${jobListHtml}

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; color: #888888; font-size: 12px;">
            <p style="margin: 0;">Sent automatically by JobDaemon</p>
          </div>
          
        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `JobDaemon <${emailFrom}>`,
      to: emailTo,
      subject: `New Internships Found (${jobs.length})`,
      html,
    });

    if (error) {
      logger.error('Error sending email summary via Resend:', error);
    } else {
      logger.info(`Email summary sent to ${emailTo} with ${jobs.length} jobs. ID: ${data?.id}`);
    }
  } catch (error) {
    logger.error('Unexpected error sending email summary:', error);
  }
}
