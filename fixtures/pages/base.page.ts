import { PageObject, Config } from "@iamkenos/kyoko";

import type { Parameters } from "./base.steps";

export class BasePage extends PageObject<Parameters> {
  protected config: Config = global.world.config;

  url = "";
  title = "";
}
