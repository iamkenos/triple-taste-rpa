import cors from "cors";
import dotenv from "@dotenvx/dotenvx";
import express from "express";
import path from "path";

dotenv.config();
function serve() {
  const app = express();
  const port = process.env.WEBHOOK_RPA_RESULTS_PORT;
  const results = "results";
  const route = path.join(__dirname, "..", results);

  app.use(cors());
  app.use(express.static(route));
  app.get("/", (_, res) => {
    res.sendFile(path.join(route, "report.html"));
  });

  app.listen(port, () => {
    console.log(`Webhook RPA Reporter Listening on Port: ${port}`);
  });
}

serve();
