import dotenv from "dotenv";
import http from "http";
import { createApp, allowedOrigins } from "./config/app";
import { setupRoutes } from "./config/routes";
import { setupGracefulShutdown } from "./config/shutdown";
import { initializeSocket } from "./libs/socket";
import logger from "./libs/logger";

dotenv.config();

const port = process.env.PORT || 7272;

// Create Express app
export const app = createApp();

// Setup routes
setupRoutes(app);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server, allowedOrigins);

// Start server
let httpServer: http.Server | undefined;

if (process.env.NODE_ENV !== "test") {
  httpServer = server.listen(Number(port), "0.0.0.0", () => {
    logger.info(`⚡ Server is ready on port:${port} 🔥`);
    logger.info(`Allowed origins: ${allowedOrigins}`);
  });
}

// Setup graceful shutdown
setupGracefulShutdown(httpServer);
