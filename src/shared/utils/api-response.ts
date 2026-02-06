import { Response } from "express";

/**
 * Standardized API Response utility
 */
export class ApiResponse {
  /**
   * Send a success response
   */
  public static success(
    res: Response,
    data: any,
    message: string = "Success",
    status: number = 200,
  ) {
    return res.status(status).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send an error response
   */
  public static error(
    res: Response,
    error: string,
    status: number = 500,
    stack?: string,
  ) {
    return res.status(status).json({
      success: false,
      error,
      ...(process.env.NODE_ENV !== "production" && stack ? { stack } : {}),
    });
  }
}
