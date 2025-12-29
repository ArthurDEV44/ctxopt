import { defineI18n } from "fumadocs-core/i18n";

export const i18n = defineI18n({
  defaultLanguage: "fr",
  languages: ["fr", "en"],
  hideLocale: "default-locale", // /docs au lieu de /fr/docs
});
