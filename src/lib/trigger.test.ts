import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTrigger } from "./trigger.ts";

describe("parseTrigger", () => {
  it("parses fg bg word", () => {
    assert.deepEqual(parseTrigger("🟥⬛cap"), {
      fg: "🟥",
      bg: "⬛",
      word: "CAP",
    });
  });

  it("strips mentions and the xcap link", () => {
    const t = parseTrigger("@bankrbot https://xcap.grok.me 🟥⬛cap");
    assert.deepEqual(t, { fg: "🟥", bg: "⬛", word: "CAP" });
  });

  it("accepts flags as a single grapheme", () => {
    const t = parseTrigger("🇺🇸⬜hey");
    assert.equal(t?.fg, "🇺🇸");
    assert.equal(t?.bg, "⬜");
    assert.equal(t?.word, "HEY");
  });

  it("rejects missing word", () => {
    assert.equal(parseTrigger("🟥⬛"), null);
  });

  it("ignores a plain word", () => {
    assert.equal(parseTrigger("CAP"), null);
  });
});
