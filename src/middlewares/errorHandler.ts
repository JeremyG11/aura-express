import { NextFunction, Request, Response } from "express";
import { ApiResponse } from "@/utils/api-response";
import { AppError } from "@/utils/errors";
import logger from "@/core/logger";

/**
 * Centralized error handler middleware.
 * Catches all unhandled errors and returns a consistent JSON response.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  if (statusCode >= 500) {
    logger.error(
      `[Error] ${req.method} ${req.url} - Status: ${statusCode}`,
      err,
    );
  }

  ApiResponse.error(res, message, statusCode, err.stack);
};
