import { PageObject } from "@iamkenos/kyoko/core";

import type { Parameters } from "./base.steps";

export class BasePage extends PageObject<Parameters> {
  url = "";
  title = "";
}
