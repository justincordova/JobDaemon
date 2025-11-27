import 'dotenv/config';
import { notify } from '../notifier.js';
import { scrapeInternList } from '../scraper.js';
import { logger } from '../logger.js';

async function runTest() {
  try {
    logger.info('Scraping jobs from InternList...');
    const jobs = await scrapeInternList();

    if (jobs.length === 0) {
        logger.warn('No jobs found on InternList to test with.');
        return;
    }

    const firstJob = jobs[0];
    logger.info(`Found job: ${firstJob.title} at ${firstJob.company}`);
    logger.info('Sending test notification...');
    
    await notify(firstJob, true);
    logger.info('Test notification sent. Check your Discord channel.');
  } catch (error) {
    logger.error('Error running test notification:', error);
  }
}

runTest();