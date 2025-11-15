import winston from 'winston';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

/**
 * Logger utility using Winston
 * Provides structured logging with file and console transports
 */

// Ensure logs directory exists
const userDataPath = app?.getPath('userData') || process.cwd();
const logsDir = path.join(userDataPath, 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} ${level.toUpperCase()} ${ctx} ${message} ${metaStr}`.trim();
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'posplus.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Logger class wrapper
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...meta: unknown[]): void {
    logger.info(message, { context: this.context, ...meta });
  }

  error(message: string, ...meta: unknown[]): void {
    logger.error(message, { context: this.context, ...meta });
  }

  warn(message: string, ...meta: unknown[]): void {
    logger.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, ...meta: unknown[]): void {
    logger.debug(message, { context: this.context, ...meta });
  }

  verbose(message: string, ...meta: unknown[]): void {
    logger.verbose(message, { context: this.context, ...meta });
  }
}

export default logger;
