# Google Calendar MCP Server

Connect to Google Calendar to see today's tasks, priorities, and schedule. Ask questions like:

- **What is there to do today?**
- **How should I do things?**
- **What should I do first?**

## Getting Started

### 1. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000/inspector](http://localhost:3000/inspector) to test the server.

### 2. Connect Google Calendar

1. **Create OAuth credentials** in [Google Cloud Console](https://console.cloud.google.com/):
   - Enable the Google Calendar API
   - Create OAuth 2.0 credentials (Web application)
   - Add redirect URI: `http://localhost:3000/oauth2callback`

2. **Save credentials** as `credentials.json` in the project root:

```bash
cp credentials.json.example credentials.json
```

Then edit `credentials.json` and replace `YOUR_CLIENT_ID` and `YOUR_CLIENT_SECRET` with the values from Google Cloud Console.

3. **Get a refresh token** (one-time):

```bash
npm run auth
```

Or: `node get-refresh-token.js`

This opens your browser for sign-in and saves `token.json`.

4. **Set environment variables** (or rely on `credentials.json` + `token.json` for local dev):

```bash
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
export GOOGLE_REFRESH_TOKEN="..."
```

See `.env.example` for a template.

## Tools

| Tool | Description |
|------|-------------|
| `get-todays-events` | Fetch today's calendar events (structured data) |
| `get-todays-schedule` | Fetch today's schedule and display a table widget |

## Prompts

| Prompt | Purpose |
|--------|---------|
| `what-to-do-today` | Summarize and prioritize today's events |
| `how-to-plan-day` | Suggest order, time blocks, and pacing |
| `what-to-do-first` | Identify the single next or most important task |

## Deploy on Manufact Cloud

```bash
npm run deploy
```

Set these environment variables as deployment secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

## Troubleshooting: invalid_client

If you see "Failed to fetch calendar: invalid_client":

**Run the verify script** to see the exact error:
```bash
npm run verify-auth
```

**Fix by recreating credentials from scratch:**

1. In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. **Delete** your existing OAuth 2.0 client (or create a new one)
3. Click **Create credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Name: e.g. "gcalmcp"
6. **Authorized redirect URIs**: Add `http://localhost:3000/oauth2callback` (exactly)
7. Click **Create** and **Download JSON**
8. Replace `credentials.json` with the downloaded file (or copy client_id and client_secret)
9. **Remove** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` from `.env` (so the app uses files)
10. Delete `token.json`, then run `npm run auth` to get a new refresh token

## Learn More

- [mcp-use Documentation](https://mcp-use.com/docs/typescript/getting-started/quickstart)
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
