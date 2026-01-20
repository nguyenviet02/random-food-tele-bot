# Telegram Food Bot (Node.js)

A Telegram bot that suggests random foods for your group chat. This is the Node.js version of the original Python bot, simplified to focus on food features only.

## Features

- 🍽️ **Random Food Suggestions** - Get a random food from the list with the `/food` command
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

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `/start`              | Get information about available commands    |
| `/help`               | Show all available commands                 |
| `/food`               | Get a random food suggestion                |
| `/newfood`            | Force a new food suggestion (ignores cache) |
| `/clearfood`*         | Clear current food suggestion               |
| `/addfood <name>`*    | Add a new food to the list                  |
| `/removefood <index>`*| Remove a food from the list by index        |
| `/foodlist`           | Show all foods in the list                  |
| `/addadmin @user`*    | Add a new admin (admin only)                |
| `/removeadmin @user`* | Remove an admin (admin only)                |
| `/listadmins`*        | List all admins (admin only)                |
| `/restrict @user`*    | Restrict a user (admin only)                |
| `/unrestrict @user`*  | Unrestrict a user (admin only)              |
| `/listrestricted`*    | List restricted users (admin only)          |

`*` Admin commands are shown only to admins in `/start` and `/help`.

## Project Structure

```
bot-nodejs/
├── package.json          # Node.js dependencies and scripts
├── README.md             # This file
├── data/
│   ├── foods.txt         # Food list
│   └── food_cache.json   # Food cache (auto-generated)
└── src/
    ├── index.js          # Main entry point with command handlers
    ├── config.js         # Configuration (paths, token, constants)
    ├── adminCommands.js  # Admin-only commands (food mgmt + admin/restrict)
    └── utils.js          # Utility functions (food, admin, restrictions, caching)
```

## Configuration

### Admins

- Admins are stored in `data/admins.json` as an array of Telegram usernames (no `@` needed):
  ```json
  ["admin1", "admin2"]
  ```
- Admin-only commands: `/addadmin`, `/removeadmin`, `/listadmins`, `/restrict`, `/unrestrict`, `/listrestricted`.
- Add yourself to the array to bootstrap the first admin.
- Defaults: values in `DEFAULT_ADMINS` (see `src/config.js`) are always included even if the file is empty; file contents merge with defaults.

### Restricted Users

- Restricted users are stored in `data/restricted_users.json` as an array of usernames:
  ```json
  ["username1", "username2"]
  ```
- Restricted users will receive a message asking them to purchase VIP when trying to use any command.
- Mutual exclusion: promoting to admin removes the user from restricted; restricting a user removes them from admins.

### Cache Duration

The default cache duration for food suggestions is 12 hours. To change this, modify `CACHE_DURATION_MS` in `src/config.js`:

```javascript
export const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // milliseconds
```

## Requirements

- Node.js >= 18.0.0
- npm

## License

MIT
