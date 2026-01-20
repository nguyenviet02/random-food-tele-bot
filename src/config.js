import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const BASE_DIR = dirname(__dirname);

// Load environment variables from .env file
config({ path: join(BASE_DIR, ".env") });

// Get token from environment variable
export const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
  console.error("Error: TELEGRAM_BOT_TOKEN is not set in .env file");
  process.exit(1);
}

// Path to the food list file
export const FOOD_LIST_PATH = join(BASE_DIR, "data", "foods.txt");

// Path to the food cache file
export const FOOD_CACHE_PATH = join(BASE_DIR, "data", "food_cache.json");

// Path to the admin database file
export const ADMIN_DB_PATH = join(BASE_DIR, "data", "admins.json");

// Path to the restricted users database file
export const RESTRICTED_USERS_DB_PATH = join(BASE_DIR, "data", "restricted_users.json");

// Cache duration in milliseconds (12 hours)
export const CACHE_DURATION_MS = 12 * 60 * 60 * 1000;

// Default admin usernames (without @)
export const DEFAULT_ADMINS = ["nguyenviet02"];
