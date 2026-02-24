/**
 * One-time script to obtain a Google Calendar refresh token.
 *
 * Prerequisites:
 * 1. Create OAuth 2.0 credentials in Google Cloud Console (Web application)
 * 2. Add redirect URI: http://localhost:3000/oauth2callback
 * 3. Save credentials as credentials.json in project root
 *
 * Run: node get-refresh-token.js
 *
 * Then set environment variables:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 */

import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { google } from "googleapis";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = join(__dirname, "credentials.json");
const TOKEN_PATH = join(__dirname, "token.json");
const REDIRECT_URI = "http://localhost:3000/oauth2callback";
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

function loadCredentials() {
  try {
    const content = readFileSync(CREDENTIALS_PATH, "utf8");
    const creds = JSON.parse(content);
    const web = creds.web ?? creds.installed;
    if (!web) throw new Error("No web or installed credentials found");
    return {
      clientId: web.client_id,
      clientSecret: web.client_secret,
    };
  } catch (err) {
    console.error(
      "Could not load credentials.json. Create OAuth 2.0 credentials in Google Cloud Console"
    );
    console.error("and save as credentials.json with web.client_id and web.client_secret.");
    process.exit(1);
  }
}

async function main() {
  const { clientId, clientSecret } = loadCredentials();

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:3000`);
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400);
      res.end("Missing authorization code. Try again.");
      server.close();
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const tokenData = {
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
      };
      writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
      console.log("\nTokens saved to token.json");

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<h1>Success!</h1><p>Tokens saved. You can close this tab.</p>" +
          "<pre>GOOGLE_REFRESH_TOKEN=" +
          (tokens.refresh_token ?? "") +
          "</pre>"
      );

      console.log("\nSet these environment variables:");
      console.log("  GOOGLE_CLIENT_ID=" + clientId);
      console.log("  GOOGLE_CLIENT_SECRET=" + clientSecret);
      console.log("  GOOGLE_REFRESH_TOKEN=" + (tokens.refresh_token ?? ""));
    } catch (err) {
      console.error("Error exchanging code:", err.message);
      res.writeHead(500);
      res.end("Error: " + err.message);
    } finally {
      server.close();
    }
  });

  server.listen(3000, () => {
    console.log("Opening browser for Google sign-in...");
    console.log("If the browser doesn't open, visit:", authUrl);
    const cmd = process.platform === "win32" ? `start "" "${authUrl}"` : `open "${authUrl}"`;
    exec(cmd, () => {});
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
