"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
/**
 * Centralized error handler middleware.
 * Catches all unhandled errors and returns a consistent JSON response.
 */
const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || "Something went wrong";
    console.error(`[Error] ${req.method} ${req.url} - Status: ${status}`, err);
    res.status(status).json({
        error: message,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map