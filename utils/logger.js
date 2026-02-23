//utils/logger.js
const isDev = process.env.NODE_ENV === 'development';

const logger = {
  info: (...args) => {
    if (isDev) console.log('[INFO]', ...args);
  },
  warn: (...args) => {
    if (isDev) console.warn('[WARN]', ...args);
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
  }
};

export default logger;
