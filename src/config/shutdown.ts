import http from "http";
import { prisma } from "@/shared/core/db";
import logger from "@/shared/core/logger";

export function serverShutdown(httpServer: http.Server | undefined): void {
  const shutdown = async (signal: string) => {
    logger.info(`\n[${signal}] Shutting down gracefully...`);

    if (httpServer) {
      httpServer.close(async () => {
        logger.info("Http server closed.");

        try {
          await prisma.$disconnect();
          logger.info("Database connection closed.");
          process.exit(0);
        } catch (err) {
          logger.error("Error during database disconnection:", err);
          process.exit(1);
        }
      });
    } else {
      try {
        await prisma.$disconnect();
        process.exit(0);
      } catch (err) {
        process.exit(1);
      }
    }

    // Force close after 10s
    setTimeout(() => {
      logger.warn(
        "Could not close connections in time, forcefully shutting down.",
      );
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
