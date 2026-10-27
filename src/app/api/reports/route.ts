import { getGemmaClient, GemmaProviderMetadata } from "@/lib/gemma/client";
import { GemmaExtractionOutput } from "@/lib/gemma/schema";
import { getStorageRepository } from "@/lib/storage/repository";
import { TrustEngine } from "@/lib/trust/engine";
import { GPSPoint, HazardReport, ReportTier } from "@/types";
import { NextRequest, NextResponse } from "next/server";

// In-memory rate limiting map: ipOrToken -> timestamp[]
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(clientIdentifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(clientIdentifier) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(clientIdentifier, timestamps);
  return true;
}

import { fuzzCoordinates } from "@/lib/privacy/fuzzing";

export async function GET(req: NextRequest) {
  const repo = getStorageRepository();
  const { searchParams } = new URL(req.url);
  const segmentId = searchParams.get("segmentId") || undefined;
  const reports = await repo.getHazardReports(segmentId);
  return NextResponse.json({
    success: true,
    count: reports.length,
    reports,
    dataSource: "seeded_demo_corridor",
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce payload size limit (max 3 MB for compressed keyframes)
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 3 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Payload exceeds 3 MB limit for ephemeral keyframe transit." },
        { status: 413 }
      );
    }

    // 2. Identity and Rate Limiting
    const authHeader =
      req.headers.get("x-safetylayer-auth") ||
      req.headers.get("authorization");
    const clientIp = req.headers.get("x-forwarded-for") || "client_default";
    const clientId = authHeader ? `auth_${authHeader.slice(-12)}` : `ip_${clientIp}`;

    if (!checkRateLimit(clientId, 10, 60000)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded (maximum 10 hazard reports per minute per client)." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      tier = 0,
      issue: userSelectedIssue,
      claim,
      keyframes,
      audioBase64,
      coordinates,
      trail = [],
      userId: bodyUserId,
      segmentId: providedSegmentId,
      hasDaylightInFrames = false,
      clientTier = "compressed_upload",
    } = body;

    // Server-side identity resolution: fall back to anonymous hashed token if bodyUserId is spoofed
    const userId = bodyUserId && bodyUserId.startsWith("user_") ? bodyUserId : `anon_${clientId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;

    if (!coordinates || typeof coordinates.lat !== "number" || typeof coordinates.lng !== "number") {
      return NextResponse.json({ success: false, error: "Missing or invalid coordinates" }, { status: 400 });
    }

    const repo = getStorageRepository();
    const allSegments = await repo.getRoadSegments();

    // Match closest segment if not provided
    let segmentId = providedSegmentId;
    if (!segmentId) {
      let closestDist = Infinity;
      for (const seg of allSegments) {
        const segCenter = seg.baselinePrior.coordinates;
        const d = TrustEngine.haversineDistanceMeters(coordinates.lat, coordinates.lng, segCenter.lat, segCenter.lng);
        if (d < closestDist) {
          closestDist = d;
          segmentId = seg.id;
        }
      }
    }

    // Step 1: Presence Verification (Module C)
    // Run on raw un-fuzzed GPS trail to guarantee exact road intersect verification
    const presenceResult = TrustEngine.verifyPresence(coordinates, trail as GPSPoint[]);

    // Step 2: Collusion / Sybil Check (Module C)
    const existingReports = await repo.getHazardReports();
    const collusionResult = TrustEngine.detectCollusion(
      { coordinates, userId, timestamp: new Date().toISOString() },
      existingReports
    );

    // Step 3: Gemma 4 Extraction (Module A)
    const gemmaClient = getGemmaClient();
    let providerMeta: GemmaProviderMetadata = gemmaClient.getMetadata();

    let extraction: GemmaExtractionOutput = {
      issue: (userSelectedIssue as any) || "other",
      time_relevance: "always",
      severity: 3 as 1 | 2 | 3 | 4 | 5,
      confidence: 0.85,
      language: "en" as "en" | "hi" | "hinglish",
      summary: claim || "Reported physical road hazard.",
      detected_elements: [] as string[],
      reasoning_trace: "Extracted via client reason chip.",
    };

    if (tier > 0 || claim || (keyframes && keyframes.length > 0)) {
      try {
        const gemmaResult = await gemmaClient.extractHazard({
          keyframes,
          audioBase64,
          transcriptClaim: claim,
          coordinates,
          timestamp: new Date().toISOString(),
        });
        extraction = gemmaResult.extraction;
        providerMeta = gemmaResult.metadata;
      } catch (err: any) {
        console.error("Gemma extraction error:", err);
      }
    }

    // Step 4: Cross-Modal Consistency Check (Module C)
    const crossModalResult = TrustEngine.verifyCrossModalConsistency(
      extraction.issue,
      extraction.time_relevance,
      new Date().toISOString(),
      hasDaylightInFrames
    );

    // Step 5: Trust and Publication Gate
    const userProfile = await repo.getTrustProfile(userId);
    let status: "published" | "verification_queue" | "rejected" = "published";
    let rejectionReason: string | undefined = undefined;

    if (!presenceResult.passed) {
      status = "rejected";
      rejectionReason = `Presence Check Failed: ${presenceResult.reason}`;
    } else if (collusionResult.isCollusionSuspected) {
      status = "verification_queue";
      rejectionReason = `Collusion Alert: ${collusionResult.reason}`;
    } else if (!crossModalResult.passed) {
      status = "rejected";
      rejectionReason = `Cross-modal Mismatch: ${crossModalResult.flaggedMismatch}`;
    } else if (extraction.confidence < 0.65) {
      status = "verification_queue";
      rejectionReason = `Low model confidence (${Math.round(extraction.confidence * 100)}% < 65% threshold)`;
    }

    // PRIVACY ENFORCEMENT: Fuzz coordinates before storing in public aggregation repository
    const fuzzedCoords = fuzzCoordinates(coordinates.lat, coordinates.lng);

    // PRIVACY ENFORCEMENT: Never retain raw video, keyframes or audio base64 in database
    const newReport: HazardReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      segmentId: segmentId || "seg_cp_outer_n1",
      tier: tier as ReportTier,
      issue: extraction.issue,
      timeRelevance: extraction.time_relevance as "day" | "night" | "always",
      severity: extraction.severity,
      confidence: extraction.confidence,
      language: extraction.language,
      summary: extraction.summary,
      rawClaim: claim,
      coordinates: fuzzedCoords,
      timestamp: new Date().toISOString(),
      userId,
      status,
      rejectionReason,
      verifiedCount: status === "published" ? 1 : 0,
      contradictedCount: 0,
      presenceVerified: presenceResult.passed,
      crossModalConsistencyScore: crossModalResult.consistencyScore,
      clientTier,
    };

    await repo.createHazardReport(newReport);

    // Update user reliability if report was valid
    if (status === "published") {
      const updatedProfile = TrustEngine.updateReporterReliability(userProfile, true);
      await repo.updateTrustProfile(updatedProfile);
    }

    return NextResponse.json({
      success: true,
      report: newReport,
      gemmaExtraction: extraction,
      gemmaMetadata: providerMeta,
      trustVerification: {
        presenceCheck: presenceResult,
        crossModalCheck: crossModalResult,
        collusionCheck: collusionResult,
        userReliability: userProfile.reliabilityScore,
      },
      privacyGuarantees: {
        locationFuzzedMeters: 25,
        rawMediaRetained: false,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
