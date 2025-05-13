import { exec } from "child_process";
import { capitalCase } from "change-case";

import { TelegramBot } from "../fixtures/services/telegram/telegram.bot";
import { escapeJsonRestricted } from "../fixtures/utils/string.utils";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";

import type { Env, RPAPayload } from "./types";

dotenv.config();
function serve() {
  const lockfile = path.join(process.cwd(), ".handler.lock");
  const bot = new TelegramBot(process.env as Env);
  const app = express();
  const port = process.env.WEBHOOK_RPA_RUNNER_PORT;

  app.use(cors());
  app.use(express.json());

  // @ts-ignore
  app.post("/run", (req, res) => {
    const { command, parameters, notifyOnSuccess, notifyOnFailureLink } = req.body as RPAPayload;
    if (!command) res.status(200).json({ message: "No command provided." });

    const isLocked = fs.existsSync(lockfile);
    if (isLocked) {
      (async() => {
        const lock = fs.readFileSync(lockfile, "utf8");
        await bot.sendMessage({
          message: `
Apologies, I can't do ${capitalCase(command)} just yet as ${capitalCase(lock) || "The previous command"} is still in progress.

Please try again after a few minutes. Thank you for your patience.`
        });
      })();
      return res.status(200).send("Command ignored");
    }

    const basecmd = `TAGS=@${command} npx cucumber-js -c cucumber.webhook.js`;
    const proc = parameters ? `${basecmd} --world-parameters '${JSON.stringify({ webhook: escapeJsonRestricted(parameters) })}'` : basecmd;

    fs.writeFileSync(lockfile, command);
    res.status(200).send("Command in progress...");
    exec(proc, (error) => {
      fs.rmSync(lockfile, { force: true, recursive: true });
      (async() => {
        if (error) {
          await bot.sendFailureMessage({ notifyOnFailureLink });
        } else {
          notifyOnSuccess && await bot.sendSuccessMessage();
        }
      })();
    });
  });

  app.listen(port, () => {
    console.log(`Webhook RPA Runner Listening on Port: ${port}`);
  });
}

serve();
