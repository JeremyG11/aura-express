"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, next) {
    console.error(err.stack);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode; // Use 500 Internal Server Error if status code is not set
    res.status(statusCode).json({
        error: {
            message: err.message,
            stack: process.env.NODE_ENV === "production" ? undefined : err.stack, // Hide stack trace in production environment
        },
    });
}
//# sourceMappingURL=errorHandler.js.map