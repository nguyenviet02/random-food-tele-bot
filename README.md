# Telegram Food and Debt Tracker Bot (Node.js)

A Telegram bot that suggests random foods and tracks debts between users in a group chat. This is the Node.js version of the original Python bot.

## Features

- 🍽️ **Random Food Suggestions** - Get a random food from the list with the `/food` command
- 💰 **Debt Tracking** - Track debt when users are tagged with amounts (e.g., `@username 100`)
- 📝 **Food List Management** - Add, remove, and view foods in the list
- 🔒 **User Restrictions** - Restrict certain users from using bot commands
- ⏰ **Caching** - Same food suggestion is returned for 12 hours

## Setup

### 1. Install Dependencies

```bash
cd bot-nodejs
npm install
```

### 2. Get a Telegram Bot Token

- Open Telegram and search for `@BotFather`
- Start a chat and send `/newbot` to create a new bot
- Follow the instructions to set a name and username for your bot
- Copy the token provided by BotFather

### 3. Configure the Bot

Copy the example environment file and add your Telegram bot token:

```bash
cp .env.example .env
```

Then edit `.env` and replace the placeholder with your actual token:

```env
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
```

### 4. Customize the Food List

Edit `data/foods.txt` to add your preferred food items, one per line.

### 5. Run the Bot

```bash
npm start
```

For development with auto-restart on file changes:

```bash
npm run dev
```

## Usage

### Available Commands

| Command              | Description                                 |
| -------------------- | ------------------------------------------- |
| `/start`             | Get information about available commands    |
| `/help`              | Show all available commands                 |
| `/food`              | Get a random food suggestion                |
| `/newfood`           | Force a new food suggestion (ignores cache) |
| `/clearfood`         | Clear current food suggestion               |
| `/addfood <name>`    | Add a new food to the list                  |
| `/removefood <name>` | Remove a food from the list                 |
| `/foodlist`          | Show all foods in the list                  |

### Track Debts

To add debt to a user, mention them with an amount:

```
@username 100
```

The bot will automatically track this and add it to the user's total debt.

## Project Structure

```
bot-nodejs/
├── package.json          # Node.js dependencies and scripts
├── README.md             # This file
├── data/
│   ├── debts.json        # Debt database (auto-generated)
│   ├── foods.txt         # Food list
│   └── food_cache.json   # Food cache (auto-generated)
└── src/
    ├── index.js          # Main entry point with command handlers
    ├── config.js         # Configuration (paths, token, constants)
    └── utils.js          # Utility functions (food, debt, caching)
```

## Configuration

### Restricted Users

To restrict certain users from using bot commands, edit the `RESTRICTED_USERS` array in `src/config.js`:

```javascript
export const RESTRICTED_USERS = ["username1", "username2"];
```

Restricted users will receive a message asking them to purchase VIP when trying to use any command.

### Cache Duration

The default cache duration for food suggestions is 12 hours. To change this, modify `CACHE_DURATION_MS` in `src/config.js`:

```javascript
export const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // milliseconds
```

## Differences from Python Version

| Aspect          | Python                     | Node.js               |
| --------------- | -------------------------- | --------------------- |
| Library         | python-telegram-bot        | node-telegram-bot-api |
| Async           | async/await                | async/await           |
| File Operations | sync with context managers | sync with fs module   |
| Package Manager | pip                        | npm                   |
| Entry Point     | `python main.py`           | `node src/index.js`   |

## Requirements

- Node.js >= 18.0.0
- npm

## License

MIT
