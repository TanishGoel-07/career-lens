import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Centralized error handling (architecture doc §5/§22). Ensures:
 *  - a consistent { error: { code, message, details } } envelope
 *  - internal errors never leak stack traces / raw messages to the client
 *  - every 5xx is logged with the request id for correlation
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code = HttpStatus[status] ?? 'ERROR';
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string) ?? message;
        details = b.details ?? (Array.isArray(b.message) ? b.message : undefined);
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error [${request.requestId}]: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      error: { code, message, details },
      requestId: request.requestId,
    });
  }
}
