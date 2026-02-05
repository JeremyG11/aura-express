import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import logger from "../src/core/logger.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_AURA_PATH = path.join(__dirname, "../../aura/prisma/schema.prisma");
const GITHUB_SCHEMA_URL =
  "https://raw.githubusercontent.com/JeremyG11/aura/main/prisma/schema.prisma";
const TARGET_PATH = path.join(__dirname, "../prisma/schema.prisma");

async function sync() {
  const targetDir = path.dirname(TARGET_PATH);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Try local copy first
  if (fs.existsSync(LOCAL_AURA_PATH)) {
    logger.info("🔄 Syncing Prisma schema from local aura project...");
    try {
      fs.copyFileSync(LOCAL_AURA_PATH, TARGET_PATH);
      logger.info("✅ Schema synced from local.");
      return;
    } catch (error: any) {
      logger.warn(
        `⚠️ Failed to copy local schema: ${error.message}. Falling back to GitHub.`,
      );
    }
  }

  // 2. Fallback to GitHub
  logger.info(
    "🌐 Local aura not found or copy failed. Fetching schema from GitHub...",
  );
  try {
    execSync(`curl -fsSL ${GITHUB_SCHEMA_URL} -o ${TARGET_PATH}`);
    logger.info("✅ Schema fetched from GitHub.");
  } catch (error: any) {
    logger.error(`❌ Failed to fetch schema from GitHub: ${error.message}`);
    process.exit(1);
  }
}

sync();
