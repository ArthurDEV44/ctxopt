import { docs } from "@/.source/server";
import { loader } from "fumadocs-core/source";
import { i18n } from "@/lib/i18n";

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: "/docs",
  i18n,
});
