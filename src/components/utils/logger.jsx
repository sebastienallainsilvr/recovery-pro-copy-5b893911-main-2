// Simple logging utility
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const logger = {
  debug: (message, data = null) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  
  info: (message, data = null) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, data);
    }
  },
  
  warn: (message, data = null) => {
    console.warn(`[WARN] ${message}`, data);
  },
  
  error: (message, data = null) => {
    console.error(`[ERROR] ${message}`, data);
  }
};