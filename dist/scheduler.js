import cron from 'node-cron';
import { scrapeJobs } from './scraper.js';
import { hasJob, saveJob } from './database.js';
import { notify } from './notifier.js';
import { logger } from './logger.js';
export function startScheduler() {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        logger.info('Running scheduled job scrape...');
        try {
            const jobs = await scrapeJobs();
            logger.info(`Found ${jobs.length} potential jobs.`);
            for (const job of jobs) {
                if (!hasJob(job.id)) {
                    saveJob(job);
                    await notify(job);
                    logger.info(`New job detected and notified: ${job.title}`);
                }
            }
        }
        catch (error) {
            logger.error('Error in scheduled job:', error);
        }
    });
    logger.info('Scheduler started. Running every 10 minutes.');
}
