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
  DEBT_DB_PATH,
  FOOD_CACHE_PATH,
  CACHE_DURATION_MS,
  RESTRICTED_USERS,
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
 * Load user debts from JSON file
 * @param {string} filePath - Path to the debt database file
 * @returns {Object} Dictionary mapping usernames to debt amounts
 */
export function loadDebts(filePath = DEBT_DB_PATH) {
  if (!existsSync(filePath)) {
    ensureDirectoryExists(filePath);
    return {};
  }

  try {
    const data = readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error loading debts: ${error.message}`);
    return {};
  }
}

/**
 * Save user debts to JSON file
 * @param {Object} debts - Dictionary mapping usernames to debt amounts
 * @param {string} filePath - Path to the debt database file
 */
export function saveDebts(debts, filePath = DEBT_DB_PATH) {
  ensureDirectoryExists(filePath);
  writeFileSync(filePath, JSON.stringify(debts, null, 2), "utf-8");
}

/**
 * Add debt to a user
 * @param {string} username - Username of the user
 * @param {number} amount - Amount to add to the debt
 * @param {string} filePath - Path to the debt database file
 * @returns {number} New total debt for the user
 */
export function addDebt(username, amount, filePath = DEBT_DB_PATH) {
  const debts = loadDebts(filePath);

  // Initialize debt for new users
  if (!(username in debts)) {
    debts[username] = 0;
  }

  // Add to existing debt
  debts[username] += amount;

  // Save updated debts
  saveDebts(debts, filePath);

  return debts[username];
}

/**
 * Get the debt of a user
 * @param {string} username - Username of the user
 * @param {string} filePath - Path to the debt database file
 * @returns {number} Total debt for the user
 */
export function getDebt(username, filePath = DEBT_DB_PATH) {
  const debts = loadDebts(filePath);
  return debts[username] || 0;
}

/**
 * Clear the debt of a user
 * @param {string} username - Username of the user
 * @param {string} filePath - Path to the debt database file
 */
export function clearDebt(username, filePath = DEBT_DB_PATH) {
  const debts = loadDebts(filePath);

  if (username in debts) {
    debts[username] = 0;
    saveDebts(debts, filePath);
  }
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

  logger.info(
    `Checking if user '${cleanUsername}' is in restricted list: ${RESTRICTED_USERS.join(", ")}`,
  );

  const result = RESTRICTED_USERS.some(
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
