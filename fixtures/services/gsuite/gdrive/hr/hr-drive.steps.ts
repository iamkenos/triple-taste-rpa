import { When } from "@cucumber/cucumber";

import type { This as GDrive } from "~/fixtures/services/gsuite/gdrive/gdrive.steps";

export interface This extends GDrive {
}

When("the service account uploads the new pay advices to the drive", async function(this: This) {
  await this.hr.uploadNewPayAdvices();
});
