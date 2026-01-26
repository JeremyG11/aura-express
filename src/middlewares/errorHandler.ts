import { NextFunction, Request, Response } from "express";

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
  const status = err.status || 500;
  const message = err.message || "Something went wrong";

  console.error(`[Error] ${req.method} ${req.url} - Status: ${status}`, err);

  res.status(status).json({
    error: message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
