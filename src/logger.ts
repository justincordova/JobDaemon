import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

/**
 * Custom Winston logger configuration.
 * Formats logs with timestamps and colorized levels.
 * Supports structured metadata logging.
 */
export const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    colorize(), // Colorize the level
    printf((info) => {
      const { timestamp, level, message, ...meta } = info;
      let log = `${timestamp} [${level}]: ${message}`;
      
      // If there is metadata, print it on the next line formatted as JSON
      if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify({ metadata: meta }, null, 2)}`;
      }
      
      return log;
    })
  ),
  transports: [new winston.transports.Console()],
});
