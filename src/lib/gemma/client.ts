import { GemmaExtractionOutput, GemmaExtractionSchema } from "./schema";

export interface GemmaExtractionInput {
  keyframes?: string[]; // base64 JPEG images (3-5 frames)
  audioBase64?: string; // base64 audio track (WAV/MP3/WebM)
  audioMimeType?: string;
  transcriptClaim?: string;
  coordinates?: { lat: number; lng: number };
  timestamp?: string;
}

export interface GemmaProviderMetadata {
  provider: "mock" | "ollama" | "hosted";
  modelId: string;
  isDegradedMock: boolean;
  degradationReason?: string;
  supportedModalities: ("text" | "image" | "audio")[];
}

export interface ExtractionWithMeta {
  extraction: GemmaExtractionOutput;
  metadata: GemmaProviderMetadata;
}

export interface GemmaClient {
  extractHazard(input: GemmaExtractionInput): Promise<ExtractionWithMeta>;
  getMetadata(): GemmaProviderMetadata;
  providerName: string;
}

export const VALID_GEMMA_MODELS: Record<string, { id: string; modalities: ("text" | "image" | "audio")[] }[]> = {
  hosted: [
    { id: "gemma-4-31b-it", modalities: ["text", "image", "audio"] },
    { id: "gemma-4-26b-a4b-it", modalities: ["text", "image", "audio"] },
    { id: "gemini-2.5-flash", modalities: ["text", "image", "audio"] },
    { id: "gemma-4-12b-it", modalities: ["text", "image", "audio"] },
    { id: "gemma-4-e4b-it", modalities: ["text", "image", "audio"] },
    { id: "gemma-4-26b-moe-it", modalities: ["text", "image", "audio"] },
    { id: "gemma-2-9b-it", modalities: ["text"] },
    { id: "gemma-2-27b-it", modalities: ["text"] },
  ],
  ollama: [
    { id: "gemma4:12b", modalities: ["text", "image", "audio"] },
    { id: "gemma4:e4b", modalities: ["text", "image", "audio"] },
    { id: "gemma2:9b", modalities: ["text"] },
    { id: "gemma2:27b", modalities: ["text"] },
    { id: "gemma:7b", modalities: ["text"] },
  ],
  mock: [
    { id: "gemma-4-12b-it", modalities: ["text", "image", "audio"] },
    { id: "mock-gemma-4-unified", modalities: ["text", "image", "audio"] },
  ],
};

export function validateModelId(provider: "mock" | "ollama" | "hosted", modelId: string): { valid: boolean; modalities: ("text" | "image" | "audio")[] } {
  const models = VALID_GEMMA_MODELS[provider] || [];
  const found = models.find((m) => m.id.toLowerCase() === modelId.toLowerCase());
  if (found) {
    return { valid: true, modalities: found.modalities };
  }
  return { valid: false, modalities: ["text"] };
}

export const GEMMA_SYSTEM_PROMPT = `You are Gemma 4 Multimodal Hazard Intelligence for SafeLayer, an ethical civic road-safety system.
Your job is to analyze multimodal road reports (video keyframes, audio recordings, or text claims in English, Hindi, or Hinglish) along with GPS metadata, and extract structured hazard data.

TAXONOMY OF ALLOWED ISSUES:
- "lighting": Inactive streetlights, pitch dark stretches, flickering or missing pole bulbs.
- "road_condition": Potholes, broken asphalt, severe waterlogging, unfinished roadworks, unpaved trenches.
- "footpath_missing": Completely broken or absent walkway forcing pedestrians directly onto high-speed vehicular traffic.
- "isolated_stretch": Long deserted roads with zero commercial footfall, no visibility, dead ends with no exits.
- "obstruction": Fallen tree branches, construction debris, dumped unlit concrete blocks, blocked lanes.
- "other": Concrete physical hazards not matching above.

CRITICAL ETHICAL RULES:
1. NEVER label neighbourhoods, communities, caste, religion, income class, or people.
2. Focus SOLELY on concrete, observable physical infrastructure and environmental safety.
3. If an input makes derogatory or demographic claims, discard the social bias and only observe the physical infrastructure, or lower confidence if no physical hazard is present.

Output strictly valid JSON with no markdown wrapping or extra commentary:
{
  "issue": "lighting" | "road_condition" | "footpath_missing" | "isolated_stretch" | "obstruction" | "other",
  "time_relevance": "day" | "night" | "always",
  "severity": 1 to 5,
  "confidence": 0.0 to 1.0,
  "language": "en" | "hi" | "hinglish",
  "summary": "Concise factual description in English (max 200 chars)",
  "raw_claim_transcription": "Original transcript of audio or claim",
  "detected_elements": ["list", "of", "observable", "objects"],
  "reasoning_trace": "Step-by-step multimodal thinking: cross-modal verification between audio claim, visual lighting/asphalt evidence, and metadata."
}`;

/**
 * Mock Gemma 4 provider for offline testing, zero-credential local runs,
 * and predictable evaluation benchmarks.
 */
export class MockGemmaProvider implements GemmaClient {
  public providerName = "mock_gemma4_unified";
  private modelId: string;

  constructor(modelId = process.env.GEMMA_MODEL_ID || "gemma-4-12b-it") {
    this.modelId = modelId;
  }

  getMetadata(): GemmaProviderMetadata {
    return {
      provider: "mock",
      modelId: this.modelId,
      isDegradedMock: false,
      supportedModalities: ["text", "image", "audio"],
    };
  }

  async extractHazard(input: GemmaExtractionInput): Promise<ExtractionWithMeta> {
    const claim = (input.transcriptClaim || "").toLowerCase();
    const isNight = input.timestamp ? new Date(input.timestamp).getHours() >= 19 || new Date(input.timestamp).getHours() < 6 : true;

    // Simulate Gemma 4 multimodal inference latency
    await new Promise((r) => setTimeout(r, 400));

    let extraction: GemmaExtractionOutput;

    if (
      claim.includes("light") ||
      claim.includes("batti") ||
      claim.includes("andhera") ||
      claim.includes("dark") ||
      claim.includes("roshni")
    ) {
      extraction = {
        issue: "lighting",
        time_relevance: "night",
        severity: 4,
        confidence: 0.94,
        language: claim.match(/[a-z]/) && (claim.includes("hai") || claim.includes("nahi")) ? "hinglish" : "hi",
        summary: "Streetlights non-functional along this stretch; near-zero nocturnal visibility.",
        raw_claim_transcription: input.transcriptClaim || "Batti nahi jal rahi hai, bohot andhera hai yahan.",
        detected_elements: ["dark_roadway", "inactive_lamp_post", "low_ambient_lumens"],
        reasoning_trace:
          "Thinking: Audio explicitly claims broken lights ('batti nahi jal rahi'). Keyframe demonstrates unlit poles with ambient lux near zero. Time metadata confirms 21:40 (nocturnal window). High cross-modal alignment.",
      };
    } else if (
      claim.includes("pothole") ||
      claim.includes("gaddha") ||
      claim.includes("broken") ||
      claim.includes("tuta") ||
      claim.includes("road")
    ) {
      extraction = {
        issue: "road_condition",
        time_relevance: "always",
        severity: 3,
        confidence: 0.91,
        language: claim.includes("gaddha") ? "hinglish" : "en",
        summary: "Multiple deep asphalt potholes and eroded road shoulders hazardous to two-wheelers.",
        raw_claim_transcription: input.transcriptClaim || "Road bohot kharab hai, bada gaddha hai.",
        detected_elements: ["pothole_cavity", "eroded_tarmac", "gravel_spill"],
        reasoning_trace:
          "Thinking: Audio notes road destruction. Visual keyframe shows clear asphalt indentation ~15cm deep spanning 1.2m. Hazard is permanent across day and night.",
      };
    } else if (claim.includes("footpath") || claim.includes("pedestrian") || claim.includes("patri")) {
      extraction = {
        issue: "footpath_missing",
        time_relevance: "always",
        severity: 3,
        confidence: 0.88,
        language: "en",
        summary: "Pedestrian footpath ends abruptly; forces walking on active vehicular lane.",
        raw_claim_transcription: input.transcriptClaim || "No footpath here, people walking on road.",
        detected_elements: ["missing_curb", "active_traffic_lane"],
        reasoning_trace: "Thinking: Observed missing sidewalk continuity. Pedestrian risk high during peak traffic.",
      };
    } else if (claim.includes("sunsaan") || claim.includes("isolated") || claim.includes("deserted")) {
      extraction = {
        issue: "isolated_stretch",
        time_relevance: "night",
        severity: 4,
        confidence: 0.85,
        language: claim.includes("sunsaan") ? "hinglish" : "en",
        summary: "Isolated road stretch with zero active commercial presence and blind corners.",
        raw_claim_transcription: input.transcriptClaim || "Bohot sunsaan rasta hai raat ko.",
        detected_elements: ["isolated_boundary_wall", "zero_open_shops"],
        reasoning_trace: "Thinking: High isolation reported. Validated by commercial places sparsity prior.",
      };
    } else if (claim.includes("tree") || claim.includes("malba") || claim.includes("debris") || claim.includes("blocked")) {
      extraction = {
        issue: "obstruction",
        time_relevance: "always",
        severity: 4,
        confidence: 0.89,
        language: "en",
        summary: "Debris and construction material obstructing two-wheeler corridor.",
        raw_claim_transcription: input.transcriptClaim || "Construction debris blocking left lane.",
        detected_elements: ["concrete_blocks", "narrowed_lane"],
        reasoning_trace: "Thinking: Physical blockage verified in foreground frame.",
      };
    } else {
      extraction = {
        issue: "other",
        time_relevance: isNight ? "night" : "day",
        severity: 2,
        confidence: 0.72,
        language: "en",
        summary: input.transcriptClaim ? `Observed: ${input.transcriptClaim.slice(0, 80)}` : "Reported route caution point.",
        raw_claim_transcription: input.transcriptClaim,
        detected_elements: ["road_segment"],
        reasoning_trace: "Thinking: General road safety report processed with baseline confidence.",
      };
    }

    return {
      extraction,
      metadata: this.getMetadata(),
    };
  }
}

/**
 * Ollama Local Gemma 4 Provider (e.g. gemma4:12b or gemma4:e4b)
 */
export class OllamaGemmaProvider implements GemmaClient {
  public providerName = "ollama_gemma4";
  private baseUrl: string;
  private modelId: string;

  constructor(
    baseUrl = process.env.GEMMA_OLLAMA_URL || "http://localhost:11434",
    modelId = process.env.GEMMA_MODEL_ID || "gemma4:12b"
  ) {
    this.baseUrl = baseUrl;
    this.modelId = modelId;

    const validation = validateModelId("ollama", this.modelId);
    if (!validation.valid) {
      const validList = VALID_GEMMA_MODELS.ollama.map((m) => m.id).join(", ");
      throw new Error(`[OllamaGemmaProvider] Unknown model ID "${this.modelId}". Valid Ollama Gemma models: ${validList}`);
    }
  }

  getMetadata(): GemmaProviderMetadata {
    const val = validateModelId("ollama", this.modelId);
    return {
      provider: "ollama",
      modelId: this.modelId,
      isDegradedMock: false,
      supportedModalities: val.modalities,
    };
  }

  async extractHazard(input: GemmaExtractionInput): Promise<ExtractionWithMeta> {
    const userPrompt = `Analyze the following road report:
Audio/Text Claim: "${input.transcriptClaim || "None provided"}"
Coordinates: Lat ${input.coordinates?.lat}, Lng ${input.coordinates?.lng}
Timestamp: ${input.timestamp || new Date().toISOString()}
Keyframes Count: ${input.keyframes?.length || 0}
Produce strict JSON according to the taxonomy schema.`;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelId,
          system: GEMMA_SYSTEM_PROMPT,
          prompt: userPrompt,
          format: "json",
          stream: false,
          images: input.keyframes ? input.keyframes.slice(0, 3) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with HTTP status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const parsed = JSON.parse(data.response);
      const extraction = GemmaExtractionSchema.parse(parsed);

      return {
        extraction,
        metadata: this.getMetadata(),
      };
    } catch (err: any) {
      console.error(`[OllamaGemmaProvider] Ollama call failed: ${err.message}`);
      // LOUD ERROR HANDLING: Do not silently pretend this was real Ollama inference!
      // Return degraded mock with visible error reason
      const fallback = await new MockGemmaProvider(this.modelId).extractHazard(input);
      return {
        extraction: fallback.extraction,
        metadata: {
          provider: "ollama",
          modelId: this.modelId,
          isDegradedMock: true,
          degradationReason: `Ollama connection failed (${err.message}). Showing degraded mock output.`,
          supportedModalities: ["text", "image", "audio"],
        },
      };
    }
  }
}

/**
 * Hosted Gemma 4 Provider (Google AI Studio / Vertex AI endpoint)
 */
export class HostedGemmaProvider implements GemmaClient {
  public providerName = "hosted_gemma4_api";
  private apiKey: string;
  private modelId: string;

  constructor(
    apiKey = process.env.GEMMA_API_KEY || "",
    modelId = process.env.GEMMA_MODEL_ID || "gemma-4-12b-it"
  ) {
    this.apiKey = apiKey;
    this.modelId = modelId;

    const validation = validateModelId("hosted", this.modelId);
    if (!validation.valid) {
      const validList = VALID_GEMMA_MODELS.hosted.map((m) => m.id).join(", ");
      throw new Error(`[HostedGemmaProvider] Unknown model ID "${this.modelId}". Valid Hosted Gemma models: ${validList}`);
    }
  }

  getMetadata(): GemmaProviderMetadata {
    const val = validateModelId("hosted", this.modelId);
    return {
      provider: "hosted",
      modelId: this.modelId,
      isDegradedMock: false,
      supportedModalities: val.modalities,
    };
  }

  async extractHazard(input: GemmaExtractionInput): Promise<ExtractionWithMeta> {
    if (!this.apiKey) {
      console.warn("[HostedGemmaProvider] GEMMA_API_KEY is not configured! Flagging as degraded mock.");
      const fallback = await new MockGemmaProvider(this.modelId).extractHazard(input);
      return {
        extraction: fallback.extraction,
        metadata: {
          provider: "hosted",
          modelId: this.modelId,
          isDegradedMock: true,
          degradationReason: "GEMMA_API_KEY is unset. Running in degraded mock mode; output is synthetic.",
          supportedModalities: ["text", "image", "audio"],
        },
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${this.apiKey}`;

    const parts: any[] = [
      {
        text: `${GEMMA_SYSTEM_PROMPT}\n\nUser Report Claim: "${input.transcriptClaim || ""}"\nTimestamp: ${input.timestamp || new Date().toISOString()}`,
      },
    ];

    if (input.keyframes && input.keyframes.length > 0) {
      for (const frame of input.keyframes.slice(0, 3)) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: frame.replace(/^data:image\/\w+;base64,/, ""),
          },
        });
      }
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Hosted API returned HTTP ${response.status}: ${errText}`);
      }

      const result = await response.json();
      const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error("Empty candidate content from Hosted Gemma API");
      }

      const cleaned = candidateText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const extraction = GemmaExtractionSchema.parse(parsed);

      return {
        extraction,
        metadata: this.getMetadata(),
      };
    } catch (err: any) {
      console.error(`[HostedGemmaProvider] API call failed: ${err.message}`);
      const fallback = await new MockGemmaProvider(this.modelId).extractHazard(input);
      return {
        extraction: fallback.extraction,
        metadata: {
          provider: "hosted",
          modelId: this.modelId,
          isDegradedMock: true,
          degradationReason: `Hosted Gemma API call failed (${err.message}). Degraded to mock.`,
          supportedModalities: ["text", "image", "audio"],
        },
      };
    }
  }
}

/**
 * Factory function to retrieve the active GemmaClient based on environment.
 */
export function getGemmaClient(): GemmaClient {
  const provider = (process.env.GEMMA_PROVIDER || "mock").toLowerCase();
  if (provider === "ollama") {
    return new OllamaGemmaProvider();
  }
  if (provider === "hosted") {
    return new HostedGemmaProvider();
  }
  return new MockGemmaProvider();
}

/**
 * Explicit runtime startup log detailing the active provider and model status.
 */
export function logGemmaStartup(): void {
  const client = getGemmaClient();
  const meta = client.getMetadata();
  console.log("=================================================");
  console.log(" [SafeLayer] ACTIVE GEMMA PROVIDER CONFIGURATION ");
  console.log("=================================================");
  console.log(` Provider:        ${meta.provider.toUpperCase()}`);
  console.log(` Model ID:        ${meta.modelId}`);
  console.log(` Modalities:      ${meta.supportedModalities.join(", ")}`);
  console.log(` Degraded Mock:   ${meta.isDegradedMock ? "YES (WARNING)" : "NO (ACTIVE)"}`);
  if (meta.degradationReason) {
    console.log(` Reason:          ${meta.degradationReason}`);
  }
  console.log("=================================================");
}
