# JobDaemon

A background service to scrape and notify about new Software Engineering internships.

## Features

- Scrapes `intern-list.com` and GitHub repositories for new listings.
- Detects new postings and avoids duplicates using SQLite.
- Sends Discord notifications for new jobs.
- Runs automatically every 10 minutes.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone git@github.com:justincordova/JobDaemon.git
    cd JobDaemon
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    - Create a `.env` file in the root directory (or copy the example).
    - Add your Discord Webhook URL:
      ```env
      DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
      EMAIL_USER=your_email@gmail.com
      EMAIL_PASS=your_app_password
      ```

    **Email Configuration (Gmail):**
    1. Go to your Google Account settings.
    2. Navigate to Security > 2-Step Verification.
    3. Scroll to the bottom and select "App passwords".
    4. Generate a new app password for "Mail" and use it as `EMAIL_PASS`.

    **How to get a Discord Webhook URL:**
    1. Open Discord and go to your server settings.
    2. Go to Integrations > Webhooks.
    3. Click "New Webhook", select the channel, and copy the Webhook URL.

## Usage

### Development Mode
Run the service with `ts-node` (auto-restarts not configured by default, but useful for testing):
```bash
npm run dev
```

### Production Build
1.  **Build the project:**
    ```bash
    npm run build
    ```

2.  **Start the daemon:**
    ```bash
    npm start
    ```

## Project Structure

- `src/scraper.ts`: Logic for fetching and parsing job data.
- `src/notifier.ts`: Handles Discord webhook notifications.
- `src/database.ts`: SQLite database operations.
- `src/scheduler.ts`: Cron job configuration.
- `src/index.ts`: Entry point.
