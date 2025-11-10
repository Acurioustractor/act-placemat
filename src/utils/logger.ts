/**
 * Centralized logging utility with environment-aware configuration
 * Prevents excessive logging in production while maintaining debugging capability
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    const isDevelopment = import.meta.env.DEV;

    this.config = {
      enabled: isDevelopment, // Only log in development by default
      minLevel: isDevelopment ? 'debug' : 'warn', // Lower threshold in dev
      prefix: config.prefix || '🔍',
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): [string, ...any[]] {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[level];

    return [`${emoji} ${message}`, ...args];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(...this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', message, ...args));
    }
  }

  // Specialized loggers for different parts of the application
  static api = new Logger({ prefix: '🌐 API' });
  static cache = new Logger({ prefix: '📦 Cache' });
  static data = new Logger({ prefix: '📊 Data' });
  static ui = new Logger({ prefix: '🎨 UI' });
}

// Export singleton instance
export const logger = new Logger();

// Export named loggers for specific domains
export const apiLogger = Logger.api;
export const cacheLogger = Logger.cache;
export const dataLogger = Logger.data;
export const uiLogger = Logger.ui;

// Export class for custom instances
export default Logger;
