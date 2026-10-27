# SafetyLayer: Privacy & Security Claims Audit (PRIVACY_AUDIT.md)

This document provides a line-by-line audit of every privacy, anonymity, and data-protection claim made across the SafetyLayer (formerly SafeLayer) application, documentation, and user interface.

| Claim | Source Location | Code Implementation | Status | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Location Fuzzing** | `PrivacyModal.tsx`, `README.md` | `fuzzCoordinates()` in `src/app/api/reports/route.ts` | **Verified** | `src/tests/privacy.test.ts` (Asserts 20-30m spatial perturbation) |
| **Zero Raw Video Retention** | `PrivacyModal.tsx`, `ReportModal.tsx` | Ephemeral handling in `src/app/api/reports/route.ts`, stripped from `HazardReport` | **Verified** | `src/tests/privacy.test.ts` (Asserts 0 media bytes written to database) |
| **Ephemeral Keyframe Downsizing** | `ReportModal.tsx` | Browser Canvas downsamples to 3-5 frames before transmission | **Verified** | Verified in client-side FileReader & Canvas extractor |
| **Face & License Plate Blurring** | `PrivacyModal.tsx`, `README.md` | Client canvas blur filter | **Partially Implemented** | Client-side Gaussian blur filter is applied across frames; full YOLO/MediaPipe edge face-detector is planned for v2 edge model. UI notice reworded to reflect client canvas blur. |
| **Aggregates-Only Public Profile** | `ScoutPanel.tsx`, `README.md` | `TrustProfile` schema in `src/types/index.ts` & `src/lib/storage/repository.ts` | **Verified** | `src/tests/privacy.test.ts` (Asserts zero raw GPS trails serialized) |
| **Scout 500m Home Blackout Zones** | `ScoutPanel.tsx`, `PrivacyModal.tsx` | `ScoutScoringEngine` privacy perimeter | **Verified** | Verified in mission distance validation |
| **Delayed Public Display (20 min)** | `ScoutPanel.tsx` | `TrustEngine` verification window | **Verified** | Uncorroborated reports held in `verification_queue` |
| **"Nothing Leaves Your Phone"** | Previous README claim | Edge on-device tier (Gemma 4 E2B/E4B) | **Reworded for Honesty** | Reworded to clarify: *"Nothing leaves your phone applies strictly to on-device edge tier; for web/cloud tier, minimal compressed keyframes/audio are transmitted via TLS and purged post-inference."* |

---

## Code Leakage & Log Audit
- **Terminal & Server Logs**: Verified that `console.log` statements in API routes do not log raw base64 media strings or un-fuzzed user coordinates.
- **Error Responses**: All catch blocks in `/api/reports`, `/api/routes`, and `/api/scout` sanitize error messages and never echo client payload buffers.
- **Secret Keys**: Verified that `.env.local` is ignored in `.gitignore`, and `.env.example` contains zero live credentials.
