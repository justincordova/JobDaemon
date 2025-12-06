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

  const jobListHtml = jobs.map((job, index) => `
    <div style="background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%); border-left: 4px solid #a78bfa; border-radius: 12px; padding: 28px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(167, 139, 250, 0.08); transition: all 0.3s ease;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <div style="color: #7c3aed; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px;">Opportunity ${index + 1}</div>
          <h3 style="margin: 0; color: #1f2937; font-size: 20px; font-weight: 700; line-height: 1.3; font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;">${job.title}</h3>
        </div>
      </div>

      <div style="background: rgba(167, 139, 250, 0.05); border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid rgba(167, 139, 250, 0.1);">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td style="padding-bottom: 10px; color: #7c3aed; font-size: 13px; font-weight: 600; width: 90px;">Company</td>
            <td style="padding-bottom: 10px; color: #374151; font-size: 14px; font-weight: 500;">${job.company || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding-bottom: 10px; color: #7c3aed; font-size: 13px; font-weight: 600;">Location</td>
            <td style="padding-bottom: 10px; color: #374151; font-size: 14px; font-weight: 500;">${job.location || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding-bottom: 10px; color: #7c3aed; font-size: 13px; font-weight: 600;">Type</td>
            <td style="padding-bottom: 10px; color: #374151; font-size: 14px; font-weight: 500;">${job.workModel || 'N/A'}</td>
          </tr>
          <tr>
            <td style="color: #7c3aed; font-size: 13px; font-weight: 600;">Salary</td>
            <td style="color: #374151; font-size: 14px; font-weight: 500;">${job.salary || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <a href="${job.link}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; text-align: center; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3); border: none; cursor: pointer; transition: all 0.2s ease;">
        View & Apply →
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
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%); color: #1f2937;">
        <div style="max-width: 640px; margin: 0 auto; padding: 24px;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); border-radius: 16px; padding: 40px 32px; margin-bottom: 32px; text-align: center; box-shadow: 0 8px 24px rgba(124, 58, 237, 0.2);">
            <div style="font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.8); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">JobDaemon</div>
            <h1 style="margin: 0 0 12px 0; color: #ffffff; font-size: 32px; font-weight: 700; line-height: 1.2;">New Opportunities</h1>
            <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 18px; font-weight: 500;">${jobs.length} fresh ${jobs.length === 1 ? 'opportunity' : 'opportunities'} waiting for you</p>
          </div>

          <!-- Job List -->
          ${jobListHtml}

          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(167, 139, 250, 0.2);">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Automatically sent by</p>
            <p style="margin: 0; color: #7c3aed; font-size: 14px; font-weight: 600;">JobDaemon</p>
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">Your personal job scout</p>
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
