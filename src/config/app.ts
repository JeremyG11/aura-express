import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import logger from "../libs/logger";

// CORS configuration - support multiple origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

export { allowedOrigins };

export function createApp(): Application {
  const app: Application = express();

  // Basic middleware
  app.use(express.json());
  app.use(cookieParser());

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    }),
  );

  // Request logging
  app.use((req, res, next) => {
    logger.info(`[Request] ${req.method} ${req.url}`);
    next();
  });

  // Rate limiting to prevent DoS/Brute-force
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  return app;
}
