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
    <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">${job.title}</h3>
      
      <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; color: #4a4a4a; font-size: 14px;">
          <span style="font-weight: 500; width: 80px; color: #666;">Company:</span>
          <span>${job.company || 'N/A'}</span>
        </div>
        <div style="display: flex; align-items: center; color: #4a4a4a; font-size: 14px;">
          <span style="font-weight: 500; width: 80px; color: #666;">Location:</span>
          <span>${job.location || 'N/A'}</span>
        </div>
        <div style="display: flex; align-items: center; color: #4a4a4a; font-size: 14px;">
          <span style="font-weight: 500; width: 80px; color: #666;">Type:</span>
          <span>${job.workModel || 'N/A'}</span>
        </div>
        <div style="display: flex; align-items: center; color: #4a4a4a; font-size: 14px;">
          <span style="font-weight: 500; width: 80px; color: #666;">Salary:</span>
          <span>${job.salary || 'N/A'}</span>
        </div>
      </div>

      <a href="${job.link}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; transition: background-color 0.2s;">
        Apply Now &rarr;
      </a>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="margin: 0; color: #000; font-size: 24px; letter-spacing: -0.5px;">JobDaemon</h1>
            <p style="margin: 8px 0 0 0; color: #666; font-size: 16px;">${jobs.length} new opportunities found</p>
          </div>

          <!-- Job List -->
          ${jobListHtml}

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px;">
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
