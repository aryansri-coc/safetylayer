# SafeLayer Verification Notes

This document records the visual, functional, and empirical verification of SafeLayer's UX simplification, Location Search, GPS Geolocation, and Routing Provider abstractions.

---

## 1. Test Suite Output (`npm test`)

The full test suite executes 33 automated tests across 8 test suites, validating:
- Geocoding parsing, min-char threshold, OSM attribution, and network failure resilience.
- RoutingProvider abstraction, OSRM and Google Directions integration.
- Polyline-to-segment snapping, threshold distance evaluation, and "No data yet" handling.
- Geolocation state machine (idle, prompting, granted, denied, timeout, unavailable, insecure context) and accuracy thresholding (>100m poor accuracy).
- Travel mode weighting (Walk, Two-wheeler, Vehicle) and nocturnal departure time derivation.
- Multimodal Hinglish extraction, privacy coordinate fuzzing (15-35m), media ephemerality, and scout reputation scoring.

```text
TAP version 13
ok 1 - GemmaExtractionSchema strictly validates valid extraction output
ok 2 - GemmaExtractionSchema rejects demographic or invalid categories
ok 3 - MockGemmaProvider processes Hinglish claim and extracts structured hazard
ok 4 - OsmPhotonGeocodingProvider: requires min 3 characters
ok 5 - OsmPhotonGeocodingProvider: handles geocoding query structure and attribution
ok 6 - OsmPhotonGeocodingProvider: gracefully handles network failure without throwing
ok 7 - checkIsInsecureContext: returns false in non-browser or localhost environments
ok 8 - GeolocationManager: initializes with idle status and empty ephemeral trail
ok 9 - GeolocationManager: poor accuracy (>100m) flags isPoorAccuracy=true
ok 10 - GeolocationManager: accurate GPS (<100m) flags isPoorAccuracy=false
ok 11 - GeolocationManager: error handler maps PERMISSION_DENIED to denied with clear message
ok 12 - GeolocationManager: error handler maps TIMEOUT to timeout status
ok 13 - Location Fuzzing: perturb coordinates within 15 to 35 meters
ok 14 - Media Ephemerality: HazardReport stored in database contains 0 raw video or keyframe data
ok 15 - Public Profile Privacy: profile endpoint serializes aggregate statistics only, never raw GPS trails
ok 16 - RoutingEngine re-ranks alternatives and recommends safer trade-off route
ok 17 - snapPolylineToSegments: snaps polyline points within threshold to known segments
ok 18 - snapPolylineToSegments: honestly flags unmapped roads with 'No data yet' and 0% coverage
ok 19 - RoutingEngine: unmapped routes receive 0 risk score and 'No data yet' status (never invent risk)
ok 20 - Scout submission alone awards 0 vested points (anti-volume rule)
ok 21 - High-volume uncorroborated spammer earns strictly less than an accurate low-volume scout
ok 22 - Daily credit cap limits reward accumulation to 100 points per cycle
ok 23 - Simulator Determinism: Same seed yields identical world and ground truth
ok 24 - Attacker Behavior: Malicious single fails physical presence check (> 70m limit)
ok 25 - Attacker Behavior: GPS spoofer fails transit velocity bounds (> 90 km/h)
ok 26 - Ground Truth Hidden Isolation: RiskModel cannot see or depend on groundTruthHazards
ok 27 - Scout Anti-Volume Incentive: Spammer earns strictly less than accurate scout
ok 28 - Time & Diurnal Logic: lighting sensitivity is derived from departure hour, not travel mode
ok 29 - Travel Mode Logic: Two-wheeler vs Pedestrian mode weighting
ok 30 - Departure Time: Nocturnal departure increases caution score for unlit corridors
ok 31 - Presence check passes for plausible commuter speed and proximity
ok 32 - Presence check rejects impossible aircraft speed (> 90 km/h) or teleportation
ok 33 - Beta distribution reputation score updates properly
1..33
# tests 33
# suites 0
# pass 33
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1718.0226
```

---

## 2. Production Build Output (`npm run build`)

`next build` successfully completes with full type safety:
```text
▲ Next.js 14.2.35
- Environments: .env.local

Creating an optimized production build ...
✓ Compiled successfully
Linting and checking validity of types ...
Collecting page data ...
✓ Generating static pages (14/14)
Finalizing page optimization ...
Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    25.5 kB         123 kB
├ ○ /_not-found                          873 B          88.2 kB
├ ○ /api/baseline                        0 B                0 B
├ ƒ /api/demo/reset                      0 B                0 B
├ ƒ /api/geocode                         0 B                0 B
├ ƒ /api/reports                         0 B                0 B
├ ƒ /api/routes                          0 B                0 B
├ ƒ /api/scout                           0 B                0 B
├ ƒ /api/sim/results                     0 B                0 B
├ ○ /api/status                          0 B                0 B
├ ○ /eval                                5.64 kB         103 kB
└ ○ /sim                                 6.98 kB         104 kB
+ First Load JS shared by all            87.3 kB
```

---

## 3. Visual Browser Verification & Screenshots

Screenshots were captured using Edge headless on desktop (1280x800) and mobile (390x844 iPhone 14/15 viewport).

| Area Verified | Screenshot File | Observations |
| :--- | :--- | :--- |
| **Welcome Card & Primary Screen** | `screenshots/desktop_1_welcome_view.png` | First-time user sees 3 clear steps: (1) Search destination, (2) Compare routes, (3) Report problem. "Try the demo" and "Got it, let's explore" buttons present. Prominent "Where to?" search bar at top. No technical HUD clutter. |
| **Search Autocomplete & OSM Attribution** | `screenshots/desktop_autocomplete_clean.png` | Typing "Janpath" triggers debounced (300ms) Photon geocoding with instant suggestions ("Janpath, Connaught Place", "Janpath, Central Vista"). Footer honestly attributes: `© OpenStreetMap contributors, Photon by Komoot \| OSM bias: India`. Stale requests cancelled. |
| **Route Comparison Cards** | `screenshots/desktop_3_route_options.png` | Shows time, distance, reported issue counts, and plain-language trade-off comparison line: `+3 min, 3 fewer reported issues`. Recommended route clearly badged. Travel modes: Walk / Two-wheeler / Vehicle. Departure time defaults to "Leave now" with "Change time". Tappable caution chips show plain-language descriptions. |
| **More Menu (Secondary Tools)** | `screenshots/desktop_4_more_menu.png` | Secondary tools cleanly consolidated: 3-Minute Demo Walkthrough, Scout HUD, Auto-Drafted Civic Notice, Evaluation Benchmarks (/eval), Simulation (/sim), Privacy Framework, and About / Developer Info. |
| **Developer Transparency Panel** | `screenshots/desktop_5_developer_info.png` | Clean honesty panel showing: Multimodal AI Model (`Hosted`, `gemma-4-12b-it`), Map Engine (`MapLibre GL`, `Carto Dark Matter`), Routing (`OSRM + Google fallback`), and Data Honesty Declaration (Central Delhi demo baseline, unmapped roads "No data yet", 5 active reports). |
| **Report Flow (Tier 0 Default)** | `screenshots/desktop_6_report_modal.png` | Step 1 defaults to 1-tap physical hazard chips (Lighting, Road condition, Missing sidewalk, Isolated corridor, Obstruction). Step 2 clearly marks voice note and video keyframes as optional extras. GPS coordinates prefilled with manual adjustment link. |
| **Location Permission Pre-Prompt** | `screenshots/desktop_7_location_prompt.png` | Pre-prompt friendly dialog explaining why location is used (route cautions, automatic origin, report prefill) and guaranteeing privacy (never tracked or stored on page load). Handles denied, timeout, and insecure contexts. |
| **Mobile Viewport (390x844)** | `screenshots/mobile_390px_primary_view.png` | Responsive bottom sheet with route options, top search bar, and large thumb-friendly "Report issue" floating action button (min 48px height). All interactive buttons meet 44px minimum tap targets. |
| **Unmapped Destination ("No data yet")** | `screenshots/unmapped_outside_demo_area.png` | When searching outside demo area (e.g. Noida / Mumbai), route is retrieved via OSRM, snapped against known segments, and honestly displays `No reports here yet. Be the first to report.` with grey segment styling and 0 risk score without inventing fake data. |

---

## 4. Manual Verification Checklist

1. **Inside Demo Area Search**:
   - Origin: "Connaught Place Outer Circle"
   - Destination: "Tolstoy Marg Junction"
   - Result: 3 routes displayed with "Demo data" badges. Fastest route passes 5 issues; safer commercial corridor is +3 min with 3 fewer reported issues.
2. **Outside Demo Area Search**:
   - Destination: "Sector 62 Noida"
   - Result: OSRM route calculated, 96% of route has no baseline and displays "No reports here yet. Be the first to report." with grey segment styling.
3. **Location Permission Cycle**:
   - Tap "Locate me": Pre-prompt explanation dialog displays.
   - Click "Allow": Browser prompts for location; on approval, blue dot with accuracy circle renders on MapLibre and map recenters.
   - If denied: Modal explains how to enable permissions via browser lock icon and provides fallback to manual search.
4. **Testing on a Real Mobile Phone**:
   - Start tunnel: `npx cloudflared tunnel --url http://localhost:3000`
   - Open HTTPS link on smartphone browser.
   - Observe mobile bottom sheet, top search bar, and live GPS accuracy ring.
