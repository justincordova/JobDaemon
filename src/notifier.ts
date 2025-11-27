import axios from 'axios';
import { Job } from './types.js';
import { logger } from './logger.js';

/**
 * Sends a Discord notification for a specific job.
 * Formats the job details into a rich embed.
 * @param job The job to notify about.
 * @param isTest Whether this is a test notification (adds a prefix).
 */
export async function notify(job: Job, isTest: boolean = false): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.error('DISCORD_WEBHOOK_URL is not defined in environment variables.');
    return;
  }

  const fields = [
    { name: 'Company', value: job.company || 'N/A', inline: false },
    { name: 'Location', value: job.location || 'N/A', inline: false },
    { name: 'Work Model', value: job.workModel || 'N/A', inline: false },
    { name: 'Date Posted', value: job.date || 'N/A', inline: false },
    { name: 'Salary', value: job.salary || 'N/A', inline: false },
  ];

  const prefix = isTest ? '**[TEST]** ' : '';

  const sourceLabel = job.source ? `From ${job.source}` : 'Unknown Source';
  
  // Date formatting logic is handled by the scraper, but we can add context here if needed.
  // InternList gives YYYY-MM-DD, GitHub gives "2d ago" style.
  // We'll just display what we have, as requested.

  const content = [

    '⋆⁺₊⋆ ━━━━━━━━━━━━━━━━━━⊱༒︎ • ༒︎⊰━━━━━━━━━━━━━━━━━━ ⋆⁺₊⋆',
    '',
    `${prefix}**New Internship** (${sourceLabel})`,
    `**Role:** ${job.title}`,
    `**Company:** ${job.company || 'N/A'}`,
    `**Location:** ${job.location || 'N/A'}`,
    `**Work Model:** ${job.workModel || 'N/A'}`,
    `**Date Posted:** ${job.date || 'N/A'}`,
    `**Salary:** ${job.salary || 'N/A'}`,
    `**Link:** ${job.link}`,
    '',
    '⋆⁺₊⋆ ━━━━━━━━━━━━━━━━━━⊱༒︎ • ༒︎⊰━━━━━━━━━━━━━━━━━━ ⋆⁺₊⋆'
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

/**
 * Sends a ping to @everyone in the Discord channel.
 * Used to alert users when a batch of new jobs is found.
 */
export async function sendPing(): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const now = new Date();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  
  // Format time as H:MM AM/PM
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const timeStr = `${hours}:${minutes}${ampm}`;

  const timestamp = `[${dateStr} | ${timeStr}]`;

  try {
    await axios.post(webhookUrl, {
      content: `@everyone\n\n**New Internship Postings ${timestamp}**`
    });
  } catch (error) {
    logger.error('Failed to send Discord ping:', error);
  }
}