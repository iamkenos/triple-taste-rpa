import { exec } from "child_process";

import { escapeJsonRestricted } from "../fixtures/utils/string.utils";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();
function serve() {
  const app = express();
  const port = process.env.WEBHOOK_RPA_RUNNER_PORT;

  app.use(cors());
  app.use(express.json());

  // @ts-ignore
  app.post("/run", (req, res) => {
    const { command, parameters } = req.body as any;
    if (!command) return res.status(200).json({ message: "No command provided." });

    const basecmd = `TAGS=@${command} npx cucumber-js -c cucumber.webhook.js`;
    const proc = parameters ? `${basecmd} --world-parameters '${JSON.stringify({ webhook: escapeJsonRestricted(parameters) })}'` : basecmd;

    exec(proc, (error, stdout, stderr) => {
      if (error) return res.status(200).json({ message: `${stderr || stdout}` });
      return res.status(200).json("Completed");
    });
  });

  app.listen(port, () => {
    console.log(`Webhook RPA Runner Listening on Port: ${port}`);
  });
}

serve();
