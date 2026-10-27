import test from "node:test";
import assert from "node:assert";
import { GemmaExtractionSchema } from "../lib/gemma/schema";
import { MockGemmaProvider } from "../lib/gemma/client";

test("GemmaExtractionSchema strictly validates valid extraction output", () => {
  const validOutput = {
    issue: "lighting",
    time_relevance: "night",
    severity: 4,
    confidence: 0.94,
    language: "hinglish",
    summary: "Streetlights non-functional along this corridor.",
    detected_elements: ["dark_road", "lamp_pole"],
  };

  const parsed = GemmaExtractionSchema.parse(validOutput);
  assert.strictEqual(parsed.issue, "lighting");
  assert.strictEqual(parsed.severity, 4);
});

test("GemmaExtractionSchema rejects demographic or invalid categories", () => {
  const invalidOutput = {
    issue: "bad_neighborhood", // Not in physical taxonomy!
    time_relevance: "night",
    severity: 3,
    confidence: 0.8,
    language: "en",
    summary: "Testing disallowed category",
  };

  assert.throws(() => {
    GemmaExtractionSchema.parse(invalidOutput);
  });
});

test("MockGemmaProvider processes Hinglish claim and extracts structured hazard", async () => {
  const provider = new MockGemmaProvider();
  const res = await provider.extractHazard({
    transcriptClaim: "Batti nahi jal rahi hai, bohot andhera hai",
    timestamp: "2026-10-26T21:40:00Z",
  });

  assert.strictEqual(res.extraction.issue, "lighting");
  assert.strictEqual(res.extraction.time_relevance, "night");
  assert.strictEqual(res.extraction.severity, 4);
  assert.ok(res.extraction.confidence > 0.9);
  assert.strictEqual(res.metadata.provider, "mock");
});
