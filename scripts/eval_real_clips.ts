import fs from "fs";
import path from "path";
import { getGemmaClient } from "../src/lib/gemma/client";

export async function evaluateRealClips() {
  const csvPath = path.join(__dirname, "real_clips", "dataset_template.csv");
  console.log("=================================================");
  console.log("    REAL-WORLD MULTIMODAL CLIPS EVALUATION       ");
  console.log("=================================================");

  if (!fs.existsSync(csvPath)) {
    console.error("❌ Dataset file not found at scripts/real_clips/dataset_template.csv");
    return;
  }

  const rawLines = fs.readFileSync(csvPath, "utf-8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

  // Check if any labelled data rows exist beyond the header
  const dataRows = rawLines.slice(1);
  if (dataRows.length === 0) {
    console.log("ℹ️  STATUS: 0 REAL-WORLD LABELLED CLIPS FOUND.");
    console.log("   The real clips evaluation suite is currently empty.");
    console.log("   To evaluate real clips:");
    console.log("   1. Place 10-15s mp4/wav files in scripts/real_clips/media/");
    console.log("   2. Label rows in scripts/real_clips/dataset_template.csv");
    console.log("   3. Run 'npm run eval:real'\n");
    console.log("   Honesty Rule: SafeLayer never fabricates real-world field metrics.");
    console.log("=================================================");
    return {
      totalClips: 0,
      evaluatedClips: 0,
      fieldAccuracy: null,
      message: "No real-world clips provided yet.",
    };
  }

  console.log(`Found ${dataRows.length} real-world labelled entries. Beginning evaluation...`);
  const client = getGemmaClient();
  let correct = 0;

  for (const row of dataRows) {
    const [clipId, videoPath, audioPath, language, trueIssue, trueSeverity, trueTime] = row.split(",");
    console.log(`Evaluating clip: ${clipId} (${language})...`);
    // Placeholder for actual video/audio file loading once media exists
  }

  return {
    totalClips: dataRows.length,
    evaluatedClips: 0,
  };
}

if (require.main === module) {
  evaluateRealClips().catch(console.error);
}
