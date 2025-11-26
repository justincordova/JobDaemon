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
            logger.info(`Found ${jobs.length} total jobs.`);
            let newJobsCount = 0;
            for (const job of jobs) {
                if (!hasJob(job.id)) {
                    saveJob(job);
                    logger.info(`New job detected: ${job.title}`);
                    // Send notification with rate limiting
                    await notify(job);
                    newJobsCount++;
                    // Wait 2 seconds between notifications to avoid Discord rate limits
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            logger.info(`Scraping completed. ${newJobsCount} new jobs found.`);
        }
        catch (error) {
            logger.error('Error in scheduled job:', error);
        }
    });
    logger.info('Scheduler started. Running every 10 minutes.');
}
