// Debug Logging Helper

// Debug levels
export const DEBUG_LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  VERBOSE: 5
};

// Current debug level (default: INFO)
let currentLevel = DEBUG_LEVELS.INFO;

// Categories that are enabled (null = all enabled)
let enabledCategories = null;

/**
 * Set the debug level
 * @param {number} level - Debug level from DEBUG_LEVELS
 */
export function setDebugLevel(level) {
  currentLevel = level;
}

/**
 * Get the current debug level
 * @returns {number} Current debug level
 */
export function getDebugLevel() {
  return currentLevel;
}

/**
 * Enable only specific categories
 * @param {string[]} categories - Array of category names to enable
 */
export function setEnabledCategories(categories) {
  enabledCategories = categories ? new Set(categories) : null;
}

/**
 * Format timestamp for log output
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  const now = new Date();
  const ms = now.getMilliseconds().toString().padStart(3, '0');
  return `${now.toLocaleTimeString()}.${ms}`;
}

/**
 * Log a debug message
 * @param {string} category - Category/module name
 * @param {string} message - Log message
 * @param {*} [data] - Optional data to log
 * @param {number} [level=DEBUG_LEVELS.DEBUG] - Message level
 */
export function debugLog(category, message, data = null, level = DEBUG_LEVELS.DEBUG) {
  // Check if level is enabled
  if (level > currentLevel) {
    return;
  }

  // Check if category is enabled
  if (enabledCategories && !enabledCategories.has(category)) {
    return;
  }

  // Format level name
  const levelNames = ['NONE', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE'];
  const levelName = levelNames[level] || 'LOG';

  // Build log string
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${levelName}] [${category}]`;

  if (data !== null) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

/**
 * Convenience functions for different log levels
 */
export function logError(category, message, data = null) {
  debugLog(category, message, data, DEBUG_LEVELS.ERROR);
}

export function logWarn(category, message, data = null) {
  debugLog(category, message, data, DEBUG_LEVELS.WARN);
}

export function logInfo(category, message, data = null) {
  debugLog(category, message, data, DEBUG_LEVELS.INFO);
}

export function logDebug(category, message, data = null) {
  debugLog(category, message, data, DEBUG_LEVELS.DEBUG);
}

export function logVerbose(category, message, data = null) {
  debugLog(category, message, data, DEBUG_LEVELS.VERBOSE);
}

/**
 * Log state changes (useful for debugging the algorithm)
 * @param {string} category - Category name
 * @param {string} varName - Variable name
 * @param {*} oldValue - Previous value
 * @param {*} newValue - New value
 */
export function logStateChange(category, varName, oldValue, newValue) {
  debugLog(category, `${varName} changed`, { from: oldValue, to: newValue }, DEBUG_LEVELS.DEBUG);
}
