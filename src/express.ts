import { exec } from "child_process";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/run", (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).send("No command provided.");
  }

  exec(`TAGS=@${command} npm run webhook-rpa`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Error: ${stderr}`);
    }
    res.send(`Output: ${stdout}`);
  });
});

const PORT = process.env.WEBHOOK_RPA_RUNNER_PORT;
app.listen(PORT, () => {
  console.log(`Webhook RPA Runner Listening on Port: ${PORT}`);
});
