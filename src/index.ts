import 'dotenv/config';
import { startScheduler } from './scheduler.js';
import { logger } from './logger.js';
import http from 'http';

logger.info('JobDaemon started.');

// Start the scheduler
startScheduler();

// Create a simple HTTP server to satisfy Render's port requirement
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('JobDaemon is running\n');
});

server.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
