import nodemailer from 'nodemailer';
import { Job } from './types.js';
import { logger } from './logger.js';

export async function sendEmailSummary(jobs: Job[]) {
  if (jobs.length === 0) return;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const recipient = 'justinavodroc@gmail.com';

  if (!user || !pass) {
    logger.warn('EMAIL_USER or EMAIL_PASS not set. Skipping email summary.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  const jobListHtml = jobs.map(job => `
    <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #333;">${job.title}</h3>
      <p style="margin: 5px 0;"><strong>Company:</strong> ${job.company || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Location:</strong> ${job.location || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Work Model:</strong> ${job.workModel || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Salary:</strong> ${job.salary || 'N/A'}</p>
      <p style="margin: 10px 0 0 0;"><a href="${job.link}" style="background-color: #007bff; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; display: inline-block;">View Job</a></p>
    </div>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px;">New Job Postings from InternList</h2>
      <p>Here are the new jobs found in the latest scrape:</p>
      ${jobListHtml}
      <p style="color: #777; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
        Sent by JobDaemon
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"JobDaemon" <${user}>`,
      to: recipient,
      subject: `New Internships Found (${jobs.length})`,
      html,
    });
    logger.info(`Email summary sent to ${recipient} with ${jobs.length} jobs.`);
  } catch (error) {
    logger.error('Error sending email summary:', error);
  }
}
