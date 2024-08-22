import "dotenv/config";
import { Before } from "@cucumber/cucumber";
import { World } from "@iamkenos/kyoko/core";

export interface Parameters {
  driveFilesToUpload: string[];
  driveSfosInvoices: string[];
}

export interface This extends World<Parameters> {
}

Before({}, async function (this: This) {

});
