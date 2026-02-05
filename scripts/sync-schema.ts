import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../src/core/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_AURA_PATH = path.join(__dirname, "../../aura/prisma/schema.prisma");
const TARGET_PATH = path.join(__dirname, "../prisma/schema.prisma");

async function sync() {
  const targetDir = path.dirname(TARGET_PATH);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Only sync if local aura is found
  if (fs.existsSync(LOCAL_AURA_PATH)) {
    logger.info("🔄 Local aura found. Syncing Prisma schema...");
    try {
      fs.copyFileSync(LOCAL_AURA_PATH, TARGET_PATH);
      logger.info("✅ Schema synced from local aura project.");
    } catch (error: any) {
      logger.error(`❌ Failed to copy local schema: ${error.message}`);
      // Don't exit with error here, as we might still have a valid schema in the repo
    }
  } else {
    logger.info(
      "ℹ️ Local aura project not found. Using existing schema in repository.",
    );
  }
}

sync();
