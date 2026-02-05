import dotenv from "dotenv";
import http from "http";
import logger from "@/core/logger";
import { setupRoutes } from "@/config/routes";
import { initializeSocket } from "@/libs/socket";
import { createApp, allowedOrigins } from "@/config/app";
import { serverShutdown } from "@/config/shutdown";

dotenv.config();

const port = process.env.PORT || 7272;

// Create Express app
export const app = createApp();

// Setup routes
setupRoutes(app);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server, allowedOrigins, app);

// Start server
let httpServer: http.Server | undefined;

if (process.env.NODE_ENV !== "test") {
  httpServer = server.listen(Number(port), "0.0.0.0", () => {
    logger.info(`⚡ Server is ready on port:${port} 🔥`);
    logger.info(`Allowed origins: ${allowedOrigins}`);
  });
}

// Setup graceful shutdown
serverShutdown(httpServer);
