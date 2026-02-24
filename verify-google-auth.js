/**
 * Verify Google OAuth credentials and token.
 * Run: node verify-google-auth.js
 * This prints which credentials are used and the exact error if refresh fails.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = join(__dirname, "credentials.json");
const TOKEN_PATH = join(__dirname, "token.json");

function loadCreds() {
  const fromEnv =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN;
  if (fromEnv) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN.trim(),
      source: ".env",
    };
  }
  if (!existsSync(CREDENTIALS_PATH) || !existsSync(TOKEN_PATH)) {
    return null;
  }
  const creds = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));
  const token = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
  const web = creds.web ?? creds.installed;
  return {
    clientId: web?.client_id?.trim(),
    clientSecret: web?.client_secret?.trim(),
    refreshToken: token?.refresh_token?.trim(),
    source: "credentials.json + token.json",
  };
}

async function main() {
  const c = loadCreds();
  if (!c) {
    console.error("No credentials found. Set .env or use credentials.json + token.json");
    process.exit(1);
  }

  console.log("Using credentials from:", c.source);
  console.log("Client ID:", c.clientId?.slice(0, 30) + "...");
  console.log("Client secret length:", c.clientSecret?.length);
  console.log("Refresh token length:", c.refreshToken?.length);
  console.log("");

  const oauth2 = new google.auth.OAuth2(
    c.clientId,
    c.clientSecret,
    "http://localhost:3000/oauth2callback"
  );
  oauth2.setCredentials({ refresh_token: c.refreshToken });

  try {
    const { credentials } = await oauth2.refreshAccessToken();
    console.log("SUCCESS: Token refresh works!");
    console.log("Access token expires:", credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : "N/A");
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Response:", JSON.stringify(err.response.data, null, 2));
    }
    console.error("");
    console.error("Next steps:");
    console.error("1. Create NEW OAuth 2.0 Web application credentials in Google Cloud Console");
    console.error("2. Add redirect URI: http://localhost:3000/oauth2callback");
    console.error("3. Download the JSON and replace credentials.json");
    console.error("4. Remove GOOGLE_* from .env (or update with new values)");
    console.error("5. Delete token.json and run: npm run auth");
    process.exit(1);
  }
}

main();
