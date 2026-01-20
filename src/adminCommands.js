import {
  logger,
  addAdmin,
  removeAdmin,
  getAllAdmins,
  checkAdminPermission,
  addRestrictedUser,
  removeRestrictedUser,
  getAllRestrictedUsers,
  clearFoodCache,
  addFoodToList,
  removeFoodByIndex,
} from "./utils.js";
import { FOOD_LIST_PATH } from "./config.js";

/**
 * Register all admin commands with the bot
 * @param {TelegramBot} bot - Telegram bot instance
 */
export function registerAdminCommands(bot) {
  /**
   * Clear current food suggestion - Admin only
   */
  bot.onText(/\/clearfood/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    const notAdmin = await checkAdminPermission(bot, chatId, user);
    if (notAdmin) return;

    clearFoodCache();
    await bot.sendMessage(
      chatId,
      "Food suggestion cleared! Use /food or /newfood to get a new suggestion.",
    );
  });

  /**
   * Add a new food to the list - Admin only
   */
  bot.onText(/\/addfood(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    const notAdmin = await checkAdminPermission(bot, chatId, user);
    if (notAdmin) return;

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
   * Remove a food from the list - Admin only
   */
  bot.onText(/\/removefood(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    const notAdmin = await checkAdminPermission(bot, chatId, user);
    if (notAdmin) return;

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
   * Add a new admin - Admin only
   */
  bot.onText(/\/addadmin(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Check admin permission
    const notAdmin = await checkAdminPermission(bot, chatId, user);
    if (notAdmin) return;

    const username = match[1]?.trim();

    if (!username) {
      await bot.sendMessage(
        chatId,
        "Please specify a username, e.g. /addadmin @username",
      );
      return;
    }

    const result = addAdmin(username);
    await bot.sendMessage(chatId, result.message);
  });

  /**
   * Remove an admin - Admin only
   */
  bot.onText(/\/removeadmin(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Check admin permission
    const notAdmin = await checkAdminPermission(bot, chatId, user);
    if (notAdmin) return;

    const username = match[1]?.trim();

    if (!username) {
      await bot.sendMessage(
        chatId,
        "Please specify a username, e.g. /removeadmin @username",
      );
      return;
    }

    const result = removeAdmin(username);
    await bot.sendMessage(chatId, result.message);
  });

  /**
   * List all admins - Admin only
   */
  bot.onText(/\/listadmins/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Check admin permission
    const notAdmin = await checkAdminPermission(bot, chatId, user);
    if (notAdmin) return;

    const admins = getAllAdmins();

    let message = "👑 *Admin List:*\n\n";

    if (admins.length > 0) {
      message += admins.map((u) => `• @${u}`).join("\n");
    } else {
      message += "_No admins configured_";
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  });

  /**
   * Restrict a user - Admin only
   */
  bot.onText(/\/restrict(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Check admin permission
    const notAdmin = await checkAdminPermission(bot, chatId, user);
    if (notAdmin) return;

    const username = match[1]?.trim();

    if (!username) {
      await bot.sendMessage(
        chatId,
        "Please specify a username, e.g. /restrict @username",
      );
      return;
    }

    const result = addRestrictedUser(username);
    await bot.sendMessage(chatId, result.message);
  });

  /**
   * Unrestrict a user - Admin only
   */
  bot.onText(/\/unrestrict(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Check admin permission
    const notAdmin = await checkAdminPermission(bot, chatId, user);
    if (notAdmin) return;

    const username = match[1]?.trim();

    if (!username) {
      await bot.sendMessage(
        chatId,
        "Please specify a username, e.g. /unrestrict @username",
      );
      return;
    }

    const result = removeRestrictedUser(username);
    await bot.sendMessage(chatId, result.message);
  });

  /**
   * List all restricted users - Admin only
   */
  bot.onText(/\/listrestricted/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Check admin permission
    const notAdmin = await checkAdminPermission(bot, chatId, user);
    if (notAdmin) return;

    const restrictedUsers = getAllRestrictedUsers();

    let message = "🚫 *Restricted Users:*\n\n";

    if (restrictedUsers.length > 0) {
      message += restrictedUsers.map((u) => `• @${u}`).join("\n");
    } else {
      message += "_No restricted users_";
    }

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  });

  logger.info("Admin commands registered");
}
