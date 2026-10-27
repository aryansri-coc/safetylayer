import { getGemmaClient, validateModelId, VALID_GEMMA_MODELS } from "../src/lib/gemma/client";
import { GemmaExtractionSchema } from "../src/lib/gemma/schema";

async function runGemmaSmoke() {
  const provider = (process.env.GEMMA_PROVIDER || "mock").toLowerCase() as "mock" | "ollama" | "hosted";
  const modelId = process.env.GEMMA_MODEL_ID || (provider === "ollama" ? "gemma4:12b" : "gemma-4-12b-it");

  console.log("=================================================");
  console.log("    SAFETYLAYER GEMMA 4 SMOKE VERIFICATION       ");
  console.log("=================================================");
  console.log(`Configured Provider:  ${provider.toUpperCase()}`);
  console.log(`Configured Model ID:  ${modelId}`);

  // 1. Validate Model ID against whitelist
  const val = validateModelId(provider, modelId);
  if (!val.valid) {
    const validList = (VALID_GEMMA_MODELS[provider] || []).map((m) => m.id).join(", ");
    console.error(`\n❌ ERROR: Unknown model ID "${modelId}" for provider "${provider}".`);
    console.error(`Valid model IDs are: ${validList}\n`);
    process.exit(1);
  }

  console.log(`Supported Modalities: ${val.modalities.join(", ")}`);
  console.log("=================================================\n");

  // Check connectivity conditions
  if (provider === "hosted" && !process.env.GEMMA_API_KEY) {
    console.warn("⚠️  ENVIRONMENT NOTICE: GEMMA_API_KEY is not set.");
    console.warn("   Hosted Google AI Studio inference cannot be executed without API key.");
    console.warn("   To run tests with synthetic inference, set GEMMA_PROVIDER=mock.\n");
    console.log("[STATUS] SMOKE RESULT: SKIPPED (Awaiting API credentials)");
    return;
  }

  if (provider === "ollama") {
    try {
      const probe = await fetch("http://localhost:11434/api/tags");
      if (!probe.ok) throw new Error("HTTP " + probe.status);
    } catch (e: any) {
      console.warn("⚠️  ENVIRONMENT NOTICE: Local Ollama daemon not reachable at http://localhost:11434.");
      console.warn("   To verify with offline synthetic extraction, set GEMMA_PROVIDER=mock.\n");
      console.log("[STATUS] SMOKE RESULT: SKIPPED (Ollama daemon offline)");
      return;
    }
  }

  // 2. Build test multimodal payload
  // Minimal 1x1 test JPEG
  const sampleKeyframe = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  const sampleClaim = "Batti nahi jal rahi hai scindia house ke paas, bohot andhera hai yahan.";

  console.log("Dispatching test payload...");
  console.log(`- Text Claim: "${sampleClaim}"`);
  console.log(`- Sample Keyframe: 1 compressed frame attached`);
  console.log(`- Audio Format: PCM Hinglish waveform`);

  const client = getGemmaClient();
  const startTime = performance.now();

  const res = await client.extractHazard({
    keyframes: [sampleKeyframe],
    audioBase64: "pcm_sample_mock_waveform_16k",
    transcriptClaim: sampleClaim,
    coordinates: { lat: 28.6302, lng: 77.2248 },
    timestamp: "2026-10-27T21:40:00Z",
  });

  const durationMs = Math.round(performance.now() - startTime);

  console.log(`\nResponse received in ${durationMs}ms:`);
  console.log(JSON.stringify(res.extraction, null, 2));

  // 3. Schema validation check
  const validated = GemmaExtractionSchema.safeParse(res.extraction);
  if (!validated.success) {
    console.error("\n❌ Schema Validation Failed:", validated.error.format());
    process.exit(1);
  }

  console.log("\n=================================================");
  console.log("✅ GEMMA 4 SMOKE TEST PASSED");
  console.log(`   Provider:       ${res.metadata.provider}`);
  console.log(`   Model:          ${res.metadata.modelId}`);
  console.log(`   Degraded Mock:  ${res.metadata.isDegradedMock}`);
  console.log(`   Latency:        ${durationMs}ms`);
  console.log(`   Detected Issue: ${res.extraction.issue}`);
  console.log(`   Severity:       ${res.extraction.severity}/5`);
  console.log(`   Confidence:     ${res.extraction.confidence}`);
  console.log("=================================================");
}

runGemmaSmoke().catch((err) => {
  console.error("Gemma Smoke Test Failed:", err);
  process.exit(1);
});
