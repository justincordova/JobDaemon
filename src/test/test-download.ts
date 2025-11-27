import 'dotenv/config';
import { scrapeInternList } from '../scraper.js';
import { logger } from '../logger.js';

/**
 * Test script to verify the CSV download and parsing logic.
 * This runs the scraper and logs the number of jobs found.
 */
async function runTest() {
  try {
    logger.info('Starting CSV download test...');
    logger.info('Calling scrapeInternList()...');
    
    const jobs = await scrapeInternList();

    if (jobs.length > 0) {
        logger.info(`Success! Found ${jobs.length} jobs.`);
        logger.info('First job sample:', jobs[0]);
    } else {
        logger.warn('No jobs found. This might be expected if no jobs match the date filter, or it could indicate a problem.');
    }

    logger.info('CSV download test completed.');
  } catch (error) {
    logger.error('Error running download test:', error);
  }
}

runTest();
