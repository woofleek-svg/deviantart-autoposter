const winston = require('winston');
const path = require('path');

// Define log levels and colors
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
  }
};

winston.addColors(customLevels.colors);

// Custom format for platform-specific logging
const platformFormat = winston.format.printf(({ level, message, timestamp, platform, ...metadata }) => {
  const platformPrefix = platform ? `[${platform.toUpperCase()}]` : '[SYSTEM]';
  const metaStr = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  return `${timestamp} ${level} ${platformPrefix} ${message} ${metaStr}`.trim();
});

// Create logger instance
const logger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    platformFormat
  ),
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        platformFormat
      )
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Error-only log file
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Platform-specific loggers
const createPlatformLogger = (platform) => {
  return {
    info: (message, meta = {}) => logger.info(message, { platform, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { platform, ...meta }),
    error: (message, meta = {}) => logger.error(message, { platform, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { platform, ...meta })
  };
};

module.exports = {
  logger,
  tumblrLogger: createPlatformLogger('tumblr'),
  instagramLogger: createPlatformLogger('instagram'),
  orchestratorLogger: createPlatformLogger('orchestrator'),
  systemLogger: createPlatformLogger('system')
};