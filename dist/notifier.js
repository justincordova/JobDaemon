import axios from 'axios';
import { logger } from './logger.js';
export async function notify(job) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.error('DISCORD_WEBHOOK_URL is not defined in environment variables.');
        return;
    }
    try {
        await axios.post(webhookUrl, {
            embeds: [
                {
                    title: job.title,
                    url: job.link,
                    description: "New SWE internship posted!",
                    color: 0x9b59ff, // Purple
                },
            ],
        });
    }
    catch (error) {
        logger.error('Failed to send Discord notification:', error);
    }
}
