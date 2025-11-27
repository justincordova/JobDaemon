import cron from 'node-cron';
import { scrapeJobs } from './scraper.js';
import { hasJob, saveJob } from './database.js';
import * as notify from './notifier.js';
import { logger } from './logger.js';

import { sendEmailSummary } from './email_notifier.js';

let isScraping = false;

/**
 * Orchestrates the job scraping and notification process.
 * 1. Scrapes jobs using the scraper module.
 * 2. Filters for new jobs that haven't been seen before.
 * 3. Sends Discord notifications for new jobs.
 * 4. Sends an email summary if new jobs were found.
 */
async function runScrape() {
  if (isScraping) {
    logger.warn('Scrape already in progress, skipping.');
    return;
  }
  
  isScraping = true;
  logger.info('Running job scrape...');
  try {
    const jobs = await scrapeJobs();
    logger.info(`Found ${jobs.length} total jobs.`);

    let newJobsCount = 0;
    const newJobsList: any[] = [];

    const jobsToNotify = jobs.filter(job => !hasJob(job.id));

    if (jobsToNotify.length > 0) {
      // Send a single ping for the batch
      await notify.sendPing();
      
      for (const job of jobsToNotify) {
        saveJob(job);
        logger.info(`New job detected: ${job.title}`, {
          role: job.title,
          company: job.company,
          location: job.location,
          workModel: job.workModel,
          datePosted: job.date,
          salary: job.salary,
          link: job.link
        });
        
        // Send notification (without ping)
        await notify.notify(job);
        newJobsCount++;
        newJobsList.push(job);
        
        // Wait 2 seconds between notifications to avoid Discord rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (newJobsList.length > 0) {
      await sendEmailSummary(newJobsList);
    }

    logger.info(`Scraping completed. ${newJobsCount} new jobs found.`);
  } catch (error) {
    logger.error('Error in job scrape:', error);
  } finally {
    isScraping = false;
  }
}

/**
 * Initializes the cron scheduler.
 * Runs the scrape job immediately on startup and then every 10 minutes.
 */
export function startScheduler() {
  // Run immediately on startup
  runScrape();

  // Run every 10 minutes
  cron.schedule('*/10 * * * *', () => {
    runScrape();
  });

  logger.info('Scheduler started. Running immediately and every 10 minutes.');
}
