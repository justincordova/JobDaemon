import 'dotenv/config';
import { notify } from './notifier.js';
import { Job } from './types.js';
import { logger } from './logger.js';

const testJob: Job = {
  id: 'https://www.google.com/about/careers/applications/jobs/results/123456',
  title: 'Software Engineering Intern, BS/MS, Summer 2026',
  company: 'Google',
  location: 'Mountain View, CA',
  date: '2025-11-26',
  salary: '$50/hr',
  link: 'https://www.google.com/about/careers/applications/jobs/results/123456',
};

async function runTest() {
  logger.info('Sending test notification...');
  await notify(testJob, true);
  logger.info('Test notification sent. Check your Discord channel.');
}

runTest();