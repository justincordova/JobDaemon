import axios from 'axios';
import { Job } from './types.js';
import { logger } from './logger.js';

export async function notify(job: Job, isTest: boolean = false): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.error('DISCORD_WEBHOOK_URL is not defined in environment variables.');
    return;
  }

  const fields = [
    { name: 'Company', value: job.company || 'N/A', inline: false },
    { name: 'Location', value: job.location || 'N/A', inline: false },
    { name: 'Date Posted', value: job.date || 'N/A', inline: false },
    { name: 'Salary', value: job.salary || 'N/A', inline: false },
  ];

  const prefix = isTest ? '[TEST] ' : '';

  const sourceLabel = job.source ? `From ${job.source}` : 'Unknown Source';
  
  // Date formatting logic is handled by the scraper, but we can add context here if needed.
  // InternList gives YYYY-MM-DD, GitHub gives "2d ago" style.
  // We'll just display what we have, as requested.

  const content = [
    `${prefix}**New Internship Opportunity!** (${sourceLabel})`,
    `**Role:** ${job.title}`,
    `**Company:** ${job.company || 'N/A'}`,
    `**Location:** ${job.location || 'N/A'}`,
    `**Date Posted:** ${job.date || 'N/A'}`,
    `**Salary:** ${job.salary || 'N/A'}`,
    `**Link:** ${job.link}`
  ].join('\n');

  const payload = {
    content: content,
    embeds: [
      {
        title: job.title,
        description: "New SWE internship posted!",
        color: 0x9b59ff, // Purple
        fields: fields,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await axios.post(webhookUrl, payload);
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      logger.error('Failed to send Discord notification:', {
        status: error.response.status,
        data: error.response.data,
      });
    } else {
      logger.error('Failed to send Discord notification:', error);
    }
  }
}