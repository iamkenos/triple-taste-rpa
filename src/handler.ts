import { exec } from "child_process";

import { TelegramBot } from "../fixtures/services/telegram/telegram.bot";
import { escapeJsonRestricted } from "../fixtures/utils/string.utils";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import type { Env, RPAPayload } from "./types";

dotenv.config();
function serve() {
  const bot = new TelegramBot(process.env as Env);
  const app = express();
  const port = process.env.WEBHOOK_RPA_RUNNER_PORT;

  app.use(cors());
  app.use(express.json());

  app.post("/run", (req, res) => {
    const { command, parameters, notifyOnSuccess, notifyOnFailureLink } = req.body as RPAPayload;
    if (!command) res.status(200).json({ message: "No command provided." });

    const basecmd = `TAGS=@${command} npx cucumber-js -c cucumber.webhook.js`;
    const proc = parameters ? `${basecmd} --world-parameters '${JSON.stringify({ webhook: escapeJsonRestricted(parameters) })}'` : basecmd;

    res.status(200).send("Command in progress...");
    exec(proc, (error) => {
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
