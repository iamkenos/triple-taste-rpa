import "dotenv/config";
import { Before } from "@cucumber/cucumber";
import { World } from "@iamkenos/kyoko/core";

import type { DateTime } from "luxon";

export interface Parameters {
  driveUploadedSfosInvoices: string[];
  sfosNewInvoices: Array<{ filename: string, soaDate: DateTime }>;
}

export interface This extends World<Parameters> {
}

Before({}, async function (this: This) {

});
