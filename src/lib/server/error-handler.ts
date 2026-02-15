import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import logger from './logger';
import { HTTP_STATUS } from './http-codes';
import type { ErrorResponse } from './requestTypes';

/**
 * Standardized error handler for server endpoints.
 * Logs full error details server-side and returns safe, generic messages to clients.
 * 
 * @param e The caught error
 * @param context Additional context for logging (e.g., username, IP)
 * @param publicMessage Generic message to return to client (default: "Internal server error")
 * @param statusCode HTTP status code (default: 500)
 * @returns JSON error response
 */
export function handleServerError(
    e: unknown,
    context: Record<string, any>,
    publicMessage: string = 'Internal server error',
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
): Response {
    // Extract error message safely
    const errorMessage = e instanceof Error ? e.message : String(e);

    // Log full error details with context
    logger.error({
        error: errorMessage,
        ...context
    }, context.operation || 'Server error');

    // In development, optionally include error details
    const clientMessage = dev
        ? `${publicMessage} (dev: ${errorMessage})`
        : publicMessage;

    return json(
        { error: clientMessage } as ErrorResponse,
        { status: statusCode }
    );
}
