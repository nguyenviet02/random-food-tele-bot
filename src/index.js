import TelegramBot from "node-telegram-bot-api";
import { TOKEN, FOOD_LIST_PATH } from "./config.js";
import {
  logger,
  getRandomFood,
  clearFoodCache,
  addFoodToList,
  removeFoodByIndex,
  getAllFoods,
  addDebt,
  isRestrictedUser,
  checkCommandRestriction,
} from "./utils.js";

// Create bot instance with polling
const bot = new TelegramBot(TOKEN, { polling: true });

logger.info("Bot started and listening for messages...");

/**
 * Send a message when the command /start is issued
 */
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  logger.info(`Start command triggered - chat ID: ${chatId}`);
  logger.info(
    `Message from user ID: ${user.id}, Username: ${user.username || "none"}`,
  );

  // Check restriction only if username exists
  if (user.username) {
    const isRestricted = await checkCommandRestriction(
      bot,
      chatId,
      user.username,
    );
    if (isRestricted) return;
  }

  const firstName = user.first_name || "User";

  await bot.sendMessage(
    chatId,
    `Hi ${firstName}! I am your Food and Debt Tracker Bot.\n\n` +
      `Commands:\n` +
      `/food - Get a random food suggestion\n` +
      `/newfood - Force a new food suggestion\n` +
      `/clearfood - Clear current food suggestion\n` +
      `/addfood - Add a new food to the list\n` +
      `/removefood - Remove a food from the list\n` +
      `/foodlist - Show all foods in the list\n` +
      `/help - Show all available commands\n\n` +
      `You can also tag a user with an amount (e.g. @username 100) to add to their debt.`,
  );
});

/**
 * Send help information when the command /help is issued
 */
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  // Check restriction only if username exists
  if (user.username) {
    const isRestricted = await checkCommandRestriction(
      bot,
      chatId,
      user.username,
    );
    if (isRestricted) return;
  }

  await bot.sendMessage(
    chatId,
    `Commands:\n` +
      `/food - Get a random food suggestion\n` +
      `/newfood - Force a new food suggestion\n` +
      `/clearfood - Clear current food suggestion\n` +
      `/addfood - Add a new food to the list\n` +
      `/removefood - Remove a food from the list\n` +
      `/foodlist - Show all foods in the list\n` +
      `/help - Show all available commands\n\n` +
      `You can also tag a user with an amount (e.g. @username 100) to add to their debt.`,
  );
});

/**
 * Send a random food suggestion when the command /food is issued
 */
bot.onText(/\/food(?!\w)/, async (msg) => {
  // Prevent matching /foodlist
  if (msg.text.startsWith("/foodlist")) return;

  const chatId = msg.chat.id;
  const user = msg.from;

  logger.info(`Food command called by user: ${user.username || user.id}`);

  // Check restriction only if username exists
  if (user.username) {
    const isRestricted = await checkCommandRestriction(
      bot,
      chatId,
      user.username,
    );
    if (isRestricted) return;
  }

  logger.info(`Food list path: ${FOOD_LIST_PATH}`);
  const food = getRandomFood(FOOD_LIST_PATH);

  if (food) {
    await bot.sendMessage(chatId, `🍽️ Random food suggestion: ${food}`);
  } else {
    await bot.sendMessage(
      chatId,
      "No foods available. Please import a food list first.",
    );
  }
});

/**
 * Force a new random food suggestion when the command /newfood is issued
 */
bot.onText(/\/newfood/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  // Check restriction only if username exists
  if (user.username) {
    const isRestricted = await checkCommandRestriction(
      bot,
      chatId,
      user.username,
    );
    if (isRestricted) return;
  }

  logger.info(`Food list path: ${FOOD_LIST_PATH}`);
  const food = getRandomFood(FOOD_LIST_PATH, true);

  if (food) {
    await bot.sendMessage(chatId, `🍽️ New food suggestion: ${food}`);
  } else {
    await bot.sendMessage(
      chatId,
      "No foods available. Please import a food list first.",
    );
  }
});

/**
 * Clear the current food suggestion when the command /clearfood is issued
 */
bot.onText(/\/clearfood/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  // Check restriction only if username exists
  if (user.username) {
    const isRestricted = await checkCommandRestriction(
      bot,
      chatId,
      user.username,
    );
    if (isRestricted) return;
  }

  clearFoodCache();
  await bot.sendMessage(
    chatId,
    "Food suggestion cleared! Use /food or /newfood to get a new suggestion.",
  );
});

/**
 * Add a new food to the food list when the command /addfood is issued
 */
bot.onText(/\/addfood(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  // Check restriction only if username exists
  if (user.username) {
    const isRestricted = await checkCommandRestriction(
      bot,
      chatId,
      user.username,
    );
    if (isRestricted) return;
  }

  const foodItem = match[1];

  if (!foodItem) {
    await bot.sendMessage(
      chatId,
      'Please specify a food to add, e.g. /addfood "Fried Rice"',
    );
    return;
  }

  const success = addFoodToList(foodItem, FOOD_LIST_PATH);

  if (success) {
    await bot.sendMessage(chatId, `Added "${foodItem}" to the food list!`);
  } else {
    await bot.sendMessage(
      chatId,
      `"${foodItem}" already exists in the food list or could not be added.`,
    );
  }
});

/**
 * Remove a food from the food list when the command /removefood is issued
 */
bot.onText(/\/removefood(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  // Check restriction only if username exists
  if (user.username) {
    const isRestricted = await checkCommandRestriction(
      bot,
      chatId,
      user.username,
    );
    if (isRestricted) return;
  }

  const indexStr = match[1];

  if (!indexStr) {
    await bot.sendMessage(
      chatId,
      "Please specify the index of the food to remove, e.g. /removefood 5\nUse /foodlist to see the numbered list.",
    );
    return;
  }

  const index = parseInt(indexStr.trim(), 10);

  if (isNaN(index)) {
    await bot.sendMessage(
      chatId,
      "Please provide a valid number, e.g. /removefood 5",
    );
    return;
  }

  const { success, message } = removeFoodByIndex(index, FOOD_LIST_PATH);
  await bot.sendMessage(chatId, message);
});

/**
 * Show all foods in the list when the command /foodlist is issued
 */
bot.onText(/\/foodlist/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  // Check restriction only if username exists
  if (user.username) {
    const isRestricted = await checkCommandRestriction(
      bot,
      chatId,
      user.username,
    );
    if (isRestricted) return;
  }

  const { formattedText } = getAllFoods(FOOD_LIST_PATH, true);

  // Telegram has a message limit, so we might need to chunk it
  if (formattedText.length > 4000) {
    const chunks = [];
    for (let i = 0; i < formattedText.length; i += 4000) {
      chunks.push(formattedText.slice(i, i + 4000));
    }

    for (let i = 0; i < chunks.length; i++) {
      const header =
        i === 0 ? `🍽️ Food List (Part ${i + 1}/${chunks.length}):\n\n` : "";
      await bot.sendMessage(chatId, `${header}${chunks[i]}`);
    }
  } else {
    await bot.sendMessage(chatId, `🍽️ Food List:\n\n${formattedText}`);
  }
});

/**
 * Process messages and look for user tags with amounts
 */
bot.on("message", async (msg) => {
  // Skip commands
  if (msg.text && msg.text.startsWith("/")) return;

  if (!msg.text) return;

  const chatId = msg.chat.id;
  const user = msg.from;

  if (user) {
    logger.info(
      `Regular message from user ID: ${user.id}, Username: ${user.username || "none"}, Text: ${msg.text.slice(0, 20)}...`,
    );
  }

  // Look for pattern @username 100
  const pattern = /@(\w+)\s+(-?\d+(?:\.\d+)?)/g;
  const matches = [...msg.text.matchAll(pattern)];

  if (matches.length === 0) return;

  // Check restriction for debt addition
  if (user.username && isRestrictedUser(user.username)) {
    logger.info(`Restricted user ${user.username} tried to add debt`);
    await bot.sendMessage(chatId, "Bạn cần nạp VIP để thực hiện lệnh này");
    return;
  }

  for (const match of matches) {
    const username = match[1];
    logger.info(`Found debt message for username: ${username}`);

    try {
      const amount = parseFloat(match[2]);
      const newTotal = addDebt(username, amount, DEBT_DB_PATH);
      await bot.sendMessage(
        chatId,
        `Added ${amount.toFixed(2)} to @${username}'s debt. New total: ${newTotal.toFixed(2)}`,
      );
    } catch (error) {
      logger.warn(`Could not convert ${match[2]} to number: ${error.message}`);
    }
  }
});

// Error handling
bot.on("polling_error", (error) => {
  logger.error(`Polling error: ${error.message}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down...");
  bot.stopPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down...");
  bot.stopPolling();
  process.exit(0);
});
