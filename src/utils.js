import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  appendFileSync,
} from "fs";
import { dirname } from "path";
import {
  FOOD_LIST_PATH,
  FOOD_CACHE_PATH,
  CACHE_DURATION_MS,
  RESTRICTED_USERS,
  ADMIN_DB_PATH,
  RESTRICTED_USERS_DB_PATH,
  DEFAULT_ADMINS,
} from "./config.js";

/**
 * Logger utility for consistent logging
 */
export const logger = {
  info: (message) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  warn: (message) =>
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),
  error: (message) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
};

/**
 * Ensure directory exists for a file path
 * @param {string} filePath - Path to file
 */
function ensureDirectoryExists(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load the cached food and timestamp from JSON file
 * @returns {Object} Cached food data
 */
export function loadFoodCache() {
  if (!existsSync(FOOD_CACHE_PATH)) {
    return {};
  }

  try {
    const data = readFileSync(FOOD_CACHE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error loading food cache: ${error.message}`);
    return {};
  }
}

/**
 * Save the current food and timestamp to cache
 * @param {string} food - The food to cache
 */
export function saveFoodCache(food) {
  ensureDirectoryExists(FOOD_CACHE_PATH);

  const cacheData = {
    food,
    timestamp: new Date().toISOString(),
  };

  writeFileSync(FOOD_CACHE_PATH, JSON.stringify(cacheData, null, 2), "utf-8");
}

/**
 * Clear the cached food suggestion
 */
export function clearFoodCache() {
  if (existsSync(FOOD_CACHE_PATH)) {
    try {
      unlinkSync(FOOD_CACHE_PATH);
      logger.info("Food cache cleared successfully");
    } catch (error) {
      logger.error(`Error clearing food cache: ${error.message}`);
    }
  }
}

/**
 * Load the list of foods from a text file
 * @param {string} filePath - Path to the food list file
 * @returns {string[]} List of food items
 */
export function loadFoodList(filePath = FOOD_LIST_PATH) {
  logger.info(`Loading food list from: ${filePath}`);
  logger.info(`File exists: ${existsSync(filePath)}`);

  if (!existsSync(filePath)) {
    logger.warn(`Food list file not found at: ${filePath}`);
    return [];
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const foods = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    logger.info(`Loaded ${foods.length} foods from list`);
    return foods;
  } catch (error) {
    logger.error(`Error loading food list: ${error.message}`);
    return [];
  }
}

/**
 * Get a random food from the food list
 * Will return the same food for 12 hours before selecting a new one, unless force_new is true
 * @param {string} filePath - Path to the food list file
 * @param {boolean} forceNew - If true, ignore cache and get a new random food
 * @returns {string|null} Random food item or null if list is empty
 */
export function getRandomFood(filePath = FOOD_LIST_PATH, forceNew = false) {
  // Check cache first (unless forceNew is true)
  if (!forceNew) {
    const cache = loadFoodCache();
    const now = new Date();

    if (cache.food && cache.timestamp) {
      const cachedTime = new Date(cache.timestamp);
      const timeDiff = now.getTime() - cachedTime.getTime();

      // If cache is still valid (less than 12 hours old)
      if (timeDiff < CACHE_DURATION_MS) {
        logger.info(`Returning cached food: ${cache.food}`);
        return cache.food;
      }
    }
  }

  // Load foods and select a new one
  const foods = loadFoodList(filePath);
  if (foods.length === 0) {
    return null;
  }

  // Select new random food
  const randomIndex = Math.floor(Math.random() * foods.length);
  const food = foods[randomIndex];
  logger.info(`Selected new random food: ${food}`);

  // Save to cache
  saveFoodCache(food);

  return food;
}

/**
 * Add a new food item to the food list
 * @param {string} food - The food item to add
 * @param {string} filePath - Path to the food list file
 * @returns {boolean} True if food was added successfully
 */
export function addFoodToList(food, filePath = FOOD_LIST_PATH) {
  try {
    ensureDirectoryExists(filePath);

    // Check if the food already exists
    const existingFoods = loadFoodList(filePath);
    const trimmedFood = food.trim();

    if (existingFoods.includes(trimmedFood)) {
      logger.info(`Food '${trimmedFood}' already exists in the list`);
      return false;
    }

    // Append the new food to the file
    appendFileSync(filePath, `\n${trimmedFood}`, "utf-8");
    logger.info(`Added new food '${trimmedFood}' to the list`);
    return true;
  } catch (error) {
    logger.error(`Error adding food to list: ${error.message}`);
    return false;
  }
}

/**
 * Remove a food item from the food list
 * @param {string} food - The food item to remove
 * @param {string} filePath - Path to the food list file
 * @returns {{success: boolean, message: string}} Result object
 */
export function removeFoodFromList(food, filePath = FOOD_LIST_PATH) {
  try {
    const existingFoods = loadFoodList(filePath);

    if (existingFoods.length === 0) {
      return { success: false, message: "Food list is empty" };
    }

    const trimmedFood = food.trim();
    const foodLower = trimmedFood.toLowerCase();

    // Find exact matches (case insensitive)
    const matches = existingFoods.filter((f) => f.toLowerCase() === foodLower);

    if (matches.length === 0) {
      // Try to find partial matches
      const partialMatches = existingFoods.filter((f) =>
        f.toLowerCase().includes(foodLower),
      );

      if (partialMatches.length > 0) {
        const matchStr = partialMatches
          .slice(0, 5)
          .map((m) => `'${m}'`)
          .join(", ");
        const moreText =
          partialMatches.length > 5
            ? ` (and ${partialMatches.length - 5} more)`
            : "";
        return {
          success: false,
          message: `Food '${food}' not found exactly. Did you mean one of: ${matchStr}${moreText}`,
        };
      }

      return {
        success: false,
        message: `Food '${food}' not found in the list`,
      };
    }

    // Remove the exact match
    const updatedFoods = existingFoods.filter(
      (f) => f.toLowerCase() !== foodLower,
    );

    // Write back to file
    ensureDirectoryExists(filePath);
    writeFileSync(filePath, updatedFoods.join("\n"), "utf-8");

    // If we've removed the current cached food, clear the cache
    const cache = loadFoodCache();
    if (
      cache.food &&
      matches.some((match) => match.toLowerCase() === cache.food.toLowerCase())
    ) {
      clearFoodCache();
      logger.info("Cleared food cache as removed food was currently cached");
    }

    logger.info(`Removed food '${matches[0]}' from the list`);

    if (matches.length > 1) {
      return {
        success: true,
        message: `Removed ${matches.length} items matching '${food}'`,
      };
    }
    return {
      success: true,
      message: `Removed '${matches[0]}' from the food list`,
    };
  } catch (error) {
    logger.error(`Error removing food from list: ${error.message}`);
    return { success: false, message: `Error removing food: ${error.message}` };
  }
}

/**
 * Remove a food item from the food list by index
 * @param {number} index - The 1-based index of the food item to remove
 * @param {string} filePath - Path to the food list file
 * @returns {{success: boolean, message: string}} Result object
 */
export function removeFoodByIndex(index, filePath = FOOD_LIST_PATH) {
  try {
    const existingFoods = loadFoodList(filePath);

    if (existingFoods.length === 0) {
      return { success: false, message: "Food list is empty" };
    }

    // Sort alphabetically to match the display order in /foodlist
    existingFoods.sort();

    // Convert 1-based index to 0-based
    const zeroIndex = index - 1;

    if (zeroIndex < 0 || zeroIndex >= existingFoods.length) {
      return {
        success: false,
        message: `Invalid index. Please use a number between 1 and ${existingFoods.length}`,
      };
    }

    const removedFood = existingFoods[zeroIndex];

    // Remove the food at the index
    existingFoods.splice(zeroIndex, 1);

    // Write back to file
    ensureDirectoryExists(filePath);
    writeFileSync(filePath, existingFoods.join("\n"), "utf-8");

    // If we've removed the current cached food, clear the cache
    const cache = loadFoodCache();
    if (cache.food && cache.food.toLowerCase() === removedFood.toLowerCase()) {
      clearFoodCache();
      logger.info("Cleared food cache as removed food was currently cached");
    }

    logger.info(`Removed food '${removedFood}' from the list (index ${index})`);

    return {
      success: true,
      message: `Removed '${removedFood}' from the food list`,
    };
  } catch (error) {
    logger.error(`Error removing food from list: ${error.message}`);
    return { success: false, message: `Error removing food: ${error.message}` };
  }
}

/**
 * Get all foods from the food list with optional formatting
 * @param {string} filePath - Path to the food list file
 * @param {boolean} numbered - If true, return a numbered list
 * @returns {{foods: string[], formattedText: string}} Foods and formatted text
 */
export function getAllFoods(filePath = FOOD_LIST_PATH, numbered = false) {
  const foods = loadFoodList(filePath);

  if (foods.length === 0) {
    return { foods: [], formattedText: "No foods available in the list." };
  }

  // Sort alphabetically
  foods.sort();

  let formattedText;
  if (numbered) {
    formattedText = foods.map((food, i) => `${i + 1}. ${food}`).join("\n");
  } else {
    formattedText = foods.map((food) => `• ${food}`).join("\n");
  }

  return { foods, formattedText };
}

/**
 * Check if a username is in the restricted list
 * @param {string} username - Username to check
 * @returns {boolean} True if the user is restricted
 */
export function isRestrictedUser(username) {
  if (!username) return false;

  // Remove @ symbol if present
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const usernameLower = cleanUsername.toLowerCase();

  // Load from database (will initialize with legacy config if needed)
  const restrictedUsers = loadRestrictedUsersFromDB();

  logger.info(
    `Checking if user '${cleanUsername}' is in restricted list: ${restrictedUsers.join(", ")}`,
  );

  const result = restrictedUsers.some(
    (user) => user.toLowerCase() === usernameLower,
  );
  logger.info(
    `Final result of restriction check for '${cleanUsername}': ${result}`,
  );

  return result;
}

/**
 * Check if a user is restricted from using commands
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID to send message to
 * @param {string} username - Username to check
 * @returns {boolean} True if the user is restricted
 */
export async function checkCommandRestriction(bot, chatId, username) {
  logger.info(`Checking command restriction for user: ${username}`);

  if (isRestrictedUser(username)) {
    logger.info(`User ${username} is restricted, sending VIP message`);
    await bot.sendMessage(chatId, "Bạn cần nạp VIP để thực hiện lệnh này");
    return true;
  }

  logger.info(`User ${username} is not restricted`);
  return false;
}

// ==================== ADMIN MANAGEMENT ====================

/**
 * Load admin list from JSON file
 * @param {string} filePath - Path to the admin database file
 * @returns {string[]} Array of admin usernames
 */
export function loadAdmins(filePath = ADMIN_DB_PATH) {
  if (!existsSync(filePath)) {
    return [...DEFAULT_ADMINS];
  }

  try {
    const data = readFileSync(filePath, "utf-8");
    const admins = JSON.parse(data);
    const list = Array.isArray(admins) ? admins : [];
    // Ensure defaults are always present
    return Array.from(
      new Set(
        [...DEFAULT_ADMINS, ...list].map((u) =>
          typeof u === "string" ? u.trim() : "",
        ),
      ),
    ).filter(Boolean);
  } catch (error) {
    logger.error(`Error loading admins: ${error.message}`);
    return [...DEFAULT_ADMINS];
  }
}

/**
 * Save admin list to JSON file
 * @param {string[]} admins - Array of admin usernames
 * @param {string} filePath - Path to the admin database file
 */
export function saveAdmins(admins, filePath = ADMIN_DB_PATH) {
  ensureDirectoryExists(filePath);
  writeFileSync(filePath, JSON.stringify(admins, null, 2), "utf-8");
}

/**
 * Check if a user is an admin by username
 * @param {string} username - Telegram username
 * @returns {boolean} True if the user is an admin
 */
export function isAdmin(username) {
  if (!username) return false;

  const admins = loadAdmins();
  const cleanUsername = username.startsWith("@")
    ? username.slice(1).toLowerCase()
    : username.toLowerCase();

  return admins.some((u) => u.toLowerCase() === cleanUsername);
}

/**
 * Add a new admin by username
 * @param {string} username - Telegram username
 * @returns {{success: boolean, message: string}} Result object
 */
export function addAdmin(username) {
  if (!username) {
    return { success: false, message: "Please provide a username" };
  }

  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const admins = loadAdmins();
  const usernameLower = cleanUsername.toLowerCase();

  if (admins.some((u) => u.toLowerCase() === usernameLower)) {
    return { success: false, message: `@${cleanUsername} is already an admin` };
  }

  admins.push(cleanUsername);
  saveAdmins(admins);
  logger.info(`Added admin: ${cleanUsername}`);
  return { success: true, message: `👑 Added @${cleanUsername} as admin` };
}

/**
 * Remove an admin by username
 * @param {string} username - Telegram username
 * @returns {{success: boolean, message: string}} Result object
 */
export function removeAdmin(username) {
  if (!username) {
    return { success: false, message: "Please provide a username" };
  }

  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const admins = loadAdmins();
  const usernameLower = cleanUsername.toLowerCase();
  const index = admins.findIndex((u) => u.toLowerCase() === usernameLower);

  if (index === -1) {
    return { success: false, message: `@${cleanUsername} is not an admin` };
  }

  admins.splice(index, 1);
  saveAdmins(admins);
  logger.info(`Removed admin: ${cleanUsername}`);
  return { success: true, message: `Removed @${cleanUsername} from admins` };
}

/**
 * Get list of all admins
 * @returns {string[]} Array of admin usernames
 */
export function getAllAdmins() {
  return loadAdmins();
}

/**
 * Check admin permission and send error message if not admin
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID to send message to
 * @param {Object} user - Telegram user object
 * @returns {boolean} True if the user is NOT an admin (restricted)
 */
export async function checkAdminPermission(bot, chatId, user) {
  const hasPermission = isAdmin(user.username);

  if (!hasPermission) {
    logger.info(`User ${user.username || user.id} attempted admin command without permission`);
    await bot.sendMessage(chatId, "⛔ Bạn không có quyền thực hiện lệnh này. Chỉ admin mới được phép.");
    return true; // Return true to indicate user is restricted
  }

  return false; // User has permission
}

// ==================== RESTRICTED USERS MANAGEMENT ====================

/**
 * Load restricted users from JSON file
 * @param {string} filePath - Path to the restricted users database file
 * @returns {string[]} Array of restricted usernames
 */
export function loadRestrictedUsersFromDB(filePath = RESTRICTED_USERS_DB_PATH) {
  if (!existsSync(filePath)) {
    // Initialize with legacy restricted users from config
    const initialData = [...RESTRICTED_USERS];
    saveRestrictedUsersToDB(initialData, filePath);
    return initialData;
  }

  try {
    const data = readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error loading restricted users: ${error.message}`);
    return [...RESTRICTED_USERS];
  }
}

/**
 * Save restricted users to JSON file
 * @param {string[]} users - Array of restricted usernames
 * @param {string} filePath - Path to the restricted users database file
 */
export function saveRestrictedUsersToDB(users, filePath = RESTRICTED_USERS_DB_PATH) {
  ensureDirectoryExists(filePath);
  writeFileSync(filePath, JSON.stringify(users, null, 2), "utf-8");
}

/**
 * Add a user to the restricted list
 * @param {string} username - Username to restrict
 * @returns {{success: boolean, message: string}} Result object
 */
export function addRestrictedUser(username) {
  if (!username) {
    return { success: false, message: "Please provide a username" };
  }

  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const users = loadRestrictedUsersFromDB();
  const usernameLower = cleanUsername.toLowerCase();

  if (users.some((u) => u.toLowerCase() === usernameLower)) {
    return { success: false, message: `@${cleanUsername} is already restricted` };
  }

  users.push(cleanUsername);
  saveRestrictedUsersToDB(users);
  logger.info(`Added restricted user: ${cleanUsername}`);
  return { success: true, message: `🚫 Đã hạn chế @${cleanUsername}` };
}

/**
 * Remove a user from the restricted list
 * @param {string} username - Username to unrestrict
 * @returns {{success: boolean, message: string}} Result object
 */
export function removeRestrictedUser(username) {
  if (!username) {
    return { success: false, message: "Please provide a username" };
  }

  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const users = loadRestrictedUsersFromDB();
  const usernameLower = cleanUsername.toLowerCase();
  const index = users.findIndex((u) => u.toLowerCase() === usernameLower);

  if (index === -1) {
    return { success: false, message: `@${cleanUsername} is not in the restricted list` };
  }

  users.splice(index, 1);
  saveRestrictedUsersToDB(users);
  logger.info(`Removed restricted user: ${cleanUsername}`);
  return { success: true, message: `✅ Đã bỏ hạn chế @${cleanUsername}` };
}

/**
 * Get list of all restricted users
 * @returns {string[]} Array of restricted usernames
 */
export function getAllRestrictedUsers() {
  return loadRestrictedUsersFromDB();
}
