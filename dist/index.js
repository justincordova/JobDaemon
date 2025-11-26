import 'dotenv/config';
import { startScheduler } from './scheduler.js';
import { logger } from './logger.js';
logger.info('JobDaemon started.');
startScheduler();
