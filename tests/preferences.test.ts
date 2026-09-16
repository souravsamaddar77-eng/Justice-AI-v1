import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { LANGUAGES, TRANSLATIONS, isLanguage, translate } from "../lib/i18n";
import { TOOLS } from "../lib/navigation";
import { DEFAULT_PREFERENCES, parsePreferences, PREFERENCES_INIT_SCRIPT, resolveTheme } from "../lib/preferences";

test("every supported Indian language has complete core navigation and tool translations", () => {
  assert.equal(LANGUAGES.length, 10);
  const english = Object.keys(TRANSLATIONS.en).sort();
  for (const language of LANGUAGES) {
    assert.equal(isLanguage(language.code), true);
    assert.deepEqual(Object.keys(TRANSLATIONS[language.code]).sort(), english);
    assert.equal(language.speechCode.endsWith("-IN"), true);
    for (const source of english) assert.equal(typeof translate(language.code, source), "string");
    for (const tool of TOOLS) {
      for (const source of [tool.title, tool.description, tool.group]) assert.ok(Object.hasOwn(TRANSLATIONS[language.code], source), `${language.code}: missing ${source}`);
    }
    if (language.code !== "en") {
      for (const source of ["Home", "My cases", "Language", "Understand a notice", "Generate Draft"]) {
        assert.notEqual(translate(language.code, source), source, `${language.code}: ${source}`);
      }
    }
  }
});

test("untranslated text stays readable and cannot resolve inherited object properties", () => {
  assert.equal(translate("ta", "New feature label"), "New feature label");
  assert.equal(translate("hi", "constructor"), "constructor");
  assert.equal(translate("bn", "__proto__"), "__proto__");
  assert.equal(isLanguage("fr"), false);
  assert.equal(isLanguage(null), false);
});

test("invalid stored preferences safely default without losing valid individual settings", () => {
  for (const invalid of [null, "broken JSON", "null", "1", '"dark"', "[]"]) {
    assert.deepEqual(parsePreferences(invalid), DEFAULT_PREFERENCES);
  }
  assert.deepEqual(parsePreferences('{"language":"bn","theme":"dark"}'), { language: "bn", theme: "dark" });
  assert.deepEqual(parsePreferences('{"language":"unknown","theme":"light"}'), { language: "en", theme: "light" });
  assert.deepEqual(parsePreferences('{"language":"ta","theme":"unknown"}'), { language: "ta", theme: "system" });
});

test("auto follows the device while explicit light and dark override it", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

function runBootstrap(saved: string | null, systemDark: boolean, denyStorage = false) {
  const classes = new Set<string>();
  const root = { lang: "en", dataset: {} as Record<string, string>, style: {} as Record<string, string>, classList: { toggle: (name: string, enabled: boolean) => enabled ? classes.add(name) : classes.delete(name) } };
  vm.runInNewContext(PREFERENCES_INIT_SCRIPT, {
    localStorage: { getItem: () => { if (denyStorage) throw new Error("Storage unavailable"); return saved; } },
    window: { matchMedia: () => ({ matches: systemDark }) },
    document: { documentElement: root },
  });
  return { root, classes };
}

test("before-paint bootstrap matches the preference resolver and document language", () => {
  for (const theme of ["light", "dark", "system"] as const) {
    for (const systemDark of [true, false]) {
      const { root, classes } = runBootstrap(JSON.stringify({ theme, language: "te" }), systemDark);
      const expected = resolveTheme(theme, systemDark);
      assert.equal(root.dataset.theme, expected);
      assert.equal(root.style.colorScheme, expected);
      assert.equal(root.lang, "te");
      assert.equal(classes.has("dark"), expected === "dark");
    }
  }
});

test("before-paint bootstrap survives corrupt and blocked storage", () => {
  for (const saved of [null, "null", "bad JSON", '{"language":"not-a-language","theme":"invalid"}']) {
    const { root } = runBootstrap(saved, true);
    assert.equal(root.dataset.theme, "dark");
    assert.equal(root.lang, "en");
  }
  assert.equal(runBootstrap(null, true, true).root.dataset.theme, "dark");
});
