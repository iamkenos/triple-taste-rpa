import { spawn } from "child_process";

import axios from "axios";
import dotenv from "@dotenvx/dotenvx";
import fs from "fs";
import path from "path";

import { TelegramBot } from "../fixtures/services/telegram/telegram.bot";
import type { Env } from "./types";

dotenv.config();
function tunnel(port: number | string): Promise<string> {
  const pattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
  return new Promise((resolve, reject) => {
    const cloudflared = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`]);

    cloudflared.stderr.on("data", (data) => {
      const output = data.toString();
      const match = output.match(pattern);
      if (match) {
        resolve(match[0]);
      }
    });

    cloudflared.on("error", (err) => {
      reject(err);
    });

    cloudflared.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });
  });
}

async function reachable(url: string, timeout = 10000, polling = 500): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, timeout));
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await axios.get(url, { validateStatus: status => (status >= 200 && status < 500 ) });
      return;
    } catch (error) {} // eslint-disable-line
    await new Promise((resolve) => setTimeout(resolve, polling));
  }

  throw new Error(`URL [${url}] is not reachable even after waiting for ${timeout}ms.`);
}

async function bootstrap(key: string, value: string) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const envconf = path.resolve(process.cwd(), ".env");
  const wranglerconf = path.resolve(process.cwd(), "wrangler.toml");
  const conf = [envconf, wranglerconf];

  for (let i = 0; i < conf.length; i++) {
    const file = conf[i];
    const contents = fs.readFileSync(file, "utf-8");
    const updated = contents.replace(pattern, `${key}="${value}"`);
    fs.writeFileSync(file, updated);
    console.log(`Updated [${key}] in [${file}] file.`);
  }
}

async function main() {
  try {
    const bot = new TelegramBot(process.env as Env);
    const WEBHOOK_PORT = 8787;
    const RESULTS_PORT = process.env.WEBHOOK_RPA_RESULTS_PORT;
    const webhookTURL = await tunnel(WEBHOOK_PORT);
    await reachable(webhookTURL);
    const response = await bot.setWebhook({ url: webhookTURL });
    bootstrap("WEBHOOK_MAIN_TUNNEL_URL", webhookTURL);
    console.log("Axios response:", response.data);

    const resultsTURL = await tunnel(RESULTS_PORT);
    bootstrap("WEBHOOK_RESULTS_TUNNEL_URL", resultsTURL);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
