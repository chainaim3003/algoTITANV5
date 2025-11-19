/**
 * Utility functions for error handling and type narrowing
 */

/**
 * Type guard to check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Extract detailed error information
 */
export interface ErrorDetails {
  message: string;
  stack?: string;
  name?: string;
}

export function getErrorDetails(error: unknown): ErrorDetails {
  if (isError(error)) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }
  return {
    message: getErrorMessage(error)
  };
}
