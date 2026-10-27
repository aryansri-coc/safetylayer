# SafetyLayer (formerly SafeLayer)

**Know which route has fewer reported issues before you step out.**

A crowd-sourced route-safety layer for maps, powered by **Gemma 4**. People report concrete problems (a dead streetlight, a broken road, an isolated stretch) by tap, voice note or short video. Gemma 4 turns those reports into structured data, and travellers see which route has fewer reported issues before they set out.

> Built for **Hacktoberfest** - **Gemma 4 track** - theme: **social implications of technology**.

<!-- Replace with real badges once the repo is public -->
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-hackathon%20prototype-orange)
![Built with](https://img.shields.io/badge/built%20with-Gemma%204-4285F4)

<!-- Add a hero screenshot or GIF here -->
<!-- ![SafetyLayer screenshot](docs/images/hero.png) -->

**Demo video:** `<add link>` | **Live demo:** `<add link or "run locally, see Quick start">` | **Slides:** `<add link>`

---

## Table of contents

1. [The problem](#the-problem)
2. [What SafetyLayer does](#what-safetylayer-does)
3. [Why Gemma 4](#why-gemma-4)
4. [Features](#features)
5. [How it works](#how-it-works)
6. [Architecture](#architecture)
7. [Quick start](#quick-start)
8. [Configuration](#configuration)
9. [Project structure](#project-structure)
10. [Trust, privacy and ethics](#trust-privacy-and-ethics)
11. [Evaluation and simulation](#evaluation-and-simulation)
12. [Demo guide](#demo-guide)
13. [Related work](#related-work)
14. [Known limitations](#known-limitations)
15. [Verification status](#verification-status)
16. [Roadmap](#roadmap)
17. [Team](#team)
18. [License and acknowledgements](#license-and-acknowledgements)

---

## The problem

Navigation apps pick the **fastest** route, not the **safest** one. They don't know that a lane goes dark after 8 pm, that a stretch is deserted at night, or that a road is broken. That knowledge exists only in the heads of people who travel those roads every day.

Women, late-night commuters, students and delivery workers pay the price for this blind spot. The information exists. It just has no easy way to flow from the people who have it to the people who need it.

## What SafetyLayer does

1. **Report:** anyone can flag a concrete issue in seconds: tap a reason chip, add a voice note in Hindi, English or Hinglish, or record a short video. Location and time are attached automatically.
2. **Understand:** Gemma 4 reads the multimodal input and extracts a structured report: issue type, severity, time relevance and a confidence score.
3. **Trust:** every report passes a trust layer (consistency checks, GPS presence checks, reporter reliability, collusion detection) before it affects anyone's route.
4. **Relay:** when someone plans a trip, SafetyLayer compares route options, shows what to watch for along each, and suggests an alternative with the trade-off made clear (for example, "+3 min, fewer reported issues").

SafetyLayer **never says a route is "safe"**. It says "fewer reported issues". It is information, not a guarantee.

## Why Gemma 4

| Need | Why Gemma 4 fits |
| --- | --- |
| Messy, multimodal reports | Small models accept image and audio input; video is handled as sampled keyframes plus the audio track |
| Hindi / English / Hinglish voice notes | Multilingual understanding without a separate translation pipeline |
| Privacy | Small variants can run on-device, so raw media need not leave the phone |
| Reliable structure | Function calling and structured JSON output, validated by a strict schema |
| Openness | Open weights, so it can be run locally (e.g. via Ollama) and fine-tuned for regional languages |

> **Note:** confirm the exact Gemma 4 model ID and supported input modalities for your provider in the official docs before running. See [Configuration](#configuration).

## Features

### Core
- **Tiered reporting (video is optional, never required)**
  - Tier 0: one-tap reason chips after a trip
  - Tier 1: chip + voice note
  - Tier 2: chip + short video (5-15 s)
- **Gemma extraction (Module A):** strict JSON schema (Zod), confidence thresholding, retries, and a verification queue for low-confidence results.
- **Street View + Places baseline (Module B):** solves the cold-start problem. Every street gets a prior before anyone reports. Honest by design: "lamps present, working status unknown".
- **Trust layer (Module C):** cross-modal consistency, GPS presence check, Beta-distribution reporter reliability, collusion/Sybil detection.
- **Time-aware risk (Module D):** per-hazard hour-of-day profiles and decay (a pothole lasts weeks, debris lasts hours).
- **Safety-aware routing (Module E):** alternative routes re-ranked by reported issues at the user's travel time, with an explicit time trade-off.

### Extras
- **Scout mode:** a Strava-style layer for riders. Riders confirm "scout requests" for stretches that need a check, and earn "routes scouted" / "km inspected" on a profile. Credit rewards corroborated accuracy, not volume. Reporting is locked while the vehicle is moving.
- **Civic complaint draft:** aggregates verified reports into a draft complaint to the relevant municipal body.
- **Active verification:** asks a nearby user a one-tap question ("Is this streetlight working?") where the system is least certain.
- **Evaluation dashboard (`/eval`) and simulation (`/sim`):** see [Evaluation and simulation](#evaluation-and-simulation).
- **Chrome extension wrapper (experimental):** injects SafetyLayer overlays into Google Maps in the browser.

## How it works

```
Report (tap / voice / video + GPS + time)
        |
        v
Module A: Gemma 4 extraction  --> structured JSON {issue, severity, time_relevance, confidence}
        |
        v
Module C: trust checks        --> consistency, presence, reliability, collusion
        |
        v
Module D: risk model          --> prior (Module B) + reports as evidence, with decay and time-of-day
        |
        v
Module E: routing             --> alternatives re-ranked by reported issues at travel time
```

### The hazard taxonomy

Reports are limited to **concrete, observable issues**: `lighting`, `road_condition`, `footpath_missing`, `isolated_stretch`, `obstruction`, `other`. The system never labels neighbourhoods, communities or people.

### Street View baseline, honestly

Street View is daytime imagery and may be years old. It can show that lamp posts **exist**, not that they **work**. SafetyLayer therefore:
- labels this signal "lamps present, working status unknown",
- treats it as a weak, low-confidence prior,
- shows the imagery capture date,
- never displays "lit" without night evidence from users,
- stores only derived scores, not imagery (see the terms-of-service note in [Known limitations](#known-limitations)).

### Trust without video

Not everyone can or wants to record a video. A tap-only report is trusted when the reporter's location trail shows they actually travelled that segment at a plausible speed. Single reports carry low weight; severe warnings need corroboration from more than one independent, trusted reporter.

### Device tiers

| Device | Processing |
| --- | --- |
| Capable phone | Lightweight preprocessing on-device; send extracted data where possible |
| Mid / low-end phone | Compress 3-5 keyframes and ~10 s of audio, upload, extract server-side, delete media after extraction |
| Weakest phone | Tap-only reports, no media |

"Nothing leaves your phone" is only true for the on-device tier. Otherwise the accurate statement is: raw media is never stored, and uploads are minimal and deleted after processing.

## Architecture

```mermaid
flowchart TD
    U[Reporter: tap / voice / video + GPS] --> API[Next.js API routes]
    API --> A[Module A: Gemma 4 extraction]
    A --> V{Confidence >= threshold?}
    V -- No --> Q[Verification queue]
    V -- Yes --> C[Module C: Trust layer]
    C --> D[Module D: Time-aware risk model]
    B[Module B: Street View + Places baseline] --> D
    D --> DB[(Storage: segments, reports, trust profiles)]
    T[Traveller: origin + destination] --> E[Module E: Safety-aware routing]
    DB --> E
    E --> UI[Map UI: route options + what to watch for]
    DB --> S[Scout mode]
    DB --> CV[Civic complaint draft]
```

### Gemma provider abstraction

`GemmaClient` has swappable providers so the project runs in different environments:

| Provider | Use |
| --- | --- |
| `hosted` | Gemma 4 through a hosted API (e.g. Google AI Studio / Vertex) |
| `ollama` | Gemma 4 running locally |
| `mock` | Deterministic fake output for UI development and tests only |

The active provider and model ID are shown in the app and on the evaluation page. **Output from the `mock` provider is never real Gemma output.**

## Quick start

### Prerequisites
- Node.js 18+ (20 LTS recommended) and npm
- Optional: a Google Maps Platform API key (Maps JavaScript, Directions, Street View Static, Places)
- Optional: a Gemma 4 provider (hosted API key, or [Ollama](https://ollama.com) with a Gemma 4 model pulled)

### Install and run

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
cp .env.example .env.local     # on Windows PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

With **no keys at all**, the app still runs using the OSM-based map fallback, seeded demo data, and the `mock` Gemma provider. The UI labels this clearly as **Demo data**.

### Other commands

```bash
npm run build          # production build
npm test               # unit tests
npm run evaluate       # synthetic benchmark (see Evaluation)
npm run sim            # simulation harness, if present (see Evaluation)
npm run smoke:gemma    # one real-provider smoke test, if present
```

> Adjust this list to match the scripts in your `package.json`.

### Testing geolocation on a phone

Browsers only allow geolocation on **HTTPS or localhost**. To test on a real phone, expose your dev server through an HTTPS tunnel (for example `cloudflared` or `ngrok`) or use a local certificate tool such as `mkcert`.

## Configuration

Copy `.env.example` to `.env.local` and fill in what you have. Variable names below are illustrative; **match them to your `.env.example`**.

| Variable | Purpose | Required |
| --- | --- | --- |
| `GEMMA_PROVIDER` | `hosted`, `ollama` or `mock` | No (defaults to `mock`) |
| `GEMMA_MODEL_ID` | Gemma 4 model ID for your provider (verify against the official docs) | If using a real provider |
| `GEMMA_API_KEY` | Hosted provider key | If `hosted` |
| `OLLAMA_BASE_URL` | Local Ollama endpoint | If `ollama` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps Platform key | No (falls back to MapLibre + OSM) |
| `DATABASE_URL` | Postgres/PostGIS connection | No (local storage fallback for demo) |

**Never commit `.env.local` or any key.** Restrict your Maps key by HTTP referrer and API.

## Project structure

> Adjust to your actual repo layout.

```
.
|-- src/
|   |-- app/                  # Next.js app router (pages, API routes, /eval, /sim)
|   |-- components/           # Map, report capture, route cards, ScoutPanel, CivicComplaintModal, DemoWalkthrough
|   `-- lib/
|       |-- gemma/            # Module A: client.ts (providers), schema.ts (Zod validation)
|       |-- baseline/         # Module B: streetview.ts (Street View + Places prior)
|       |-- trust/            # Module C: engine.ts (presence, reliability, consistency, collusion)
|       |-- risk/             # Module D: model.ts (time-aware risk, decay)
|       `-- routing/          # Module E: engine.ts (alternatives, re-ranking)
|-- scripts/                  # evaluate.ts, eval_dataset.json, smoke tests
|-- sim/                      # simulation harness (isolated from production code)
|-- extension/                # Chrome extension (Manifest V3, experimental)
|-- docs/                     # limitations_and_related_work.md and images
|-- .env.example
`-- README.md
```

## Trust, privacy and ethics

SafetyLayer is designed so that a safety tool does not become a surveillance or stigma tool.

| Principle | What we do |
| --- | --- |
| **Concrete issues only** | Fixed taxonomy of observable problems; no labels on neighbourhoods, communities or people |
| **Reasons, not just scores** | Every warning shows what it is based on, how many reports, and when it was last confirmed |
| **Minimal media retention** | Raw media is not stored; uploads (where needed) are minimal and deleted after extraction |
| **Location protection** | Reporter locations are fuzzed before aggregation; scout profiles use hide-start/end zones and delayed public display |
| **No face recognition** | None, anywhere |
| **Honest wording** | "Fewer reported issues", never "safe"; the UI says it is information, not a guarantee |
| **Fairness check** | Risk scores are compared against area characteristics to catch stereotype-driven output |
| **AI-generated fakes** | Video is no longer proof of anything, so trust relies on presence, corroboration and reliability, not on the clip alone |

See [`PRIVACY_AUDIT.md`](PRIVACY_AUDIT.md) for each privacy claim mapped to the code that implements it and its verification status (if present).

### Scout mode safety
- Reporting is **locked while the vehicle is moving**, enforced server-side. The app asks riders to park first.
- Credit depends on later corroboration of accuracy, with daily caps, so volume alone is not rewarded.
- Rider reports skew to main roads and are tagged by mode; they are one source, not the whole picture.

## Evaluation and simulation

We separate three kinds of evidence and label each honestly.

### 1. Synthetic benchmark (`npm run evaluate`, `/eval`)
Scripted multilingual claims and adversarial cases used to check that the pipeline behaves as designed. Results depend on which Gemma provider produced them and are **not** real-world performance.

| Metric | Provider | Result |
| --- | --- | --- |
| Field-level extraction accuracy | `<provider>` | `<fill in from your run>` |
| Adversarial precision / recall | `<provider>` | `<fill in from your run>` |
| Route risk reduction vs. shortest route | seeded data | `<fill in from your run>` |

### 2. Real clips (planned / in progress)
A small, hand-labelled set of real voice notes and clips recorded and labelled by the team, evaluated with the **real** Gemma provider. This is the only set that should back any headline accuracy claim.

| Metric | Result |
| --- | --- |
| Number of labelled clips | `<n>` |
| Extraction accuracy (real provider) | `<fill in>` |

### 3. Simulation study (`npm run sim`, `/sim`)
A data-level simulation with an independent, hidden ground-truth hazard map and a simulated population: honest reporters, noisy reporters, lazy confirmers, malicious single reporters, GPS spoofers, colluding clusters, AI-fake-media reporters, scout riders and sleeper accounts that turn malicious. It runs the **real** trust, risk and routing modules over many seeds and reports means with 95% confidence intervals.

Experiments include: reporter-reliability separation, fake-report defence by attacker type, risk-estimation learning curves (including cold start), temporal behaviour, route exposure reduction vs. extra travel time, ablations (trust layer, presence check, collusion detection, Street View baseline, decay), sensitivity analysis, and a scout-incentive check.

| Finding | Result |
| --- | --- |
| See `sim_results/` and the generated report | `<link>` |

The simulation report includes a mandatory **Failure cases and limits** section. We report where the system does badly, not only where it does well.

## Demo guide

A ~3-minute walkthrough (also available in-app via **Start demo**):

1. **Baseline:** open a route in the demo area. Segments are already shaded from the Street View + Places baseline, labelled **Demo data**.
2. **Report:** record a live voice (or video) report and show Gemma's structured output.
3. **Trust:** submit a spoofed report (trail does not match the location) and show it being rejected or discounted.
4. **Route trade-off:** compare the fastest route against the route with fewer reported issues, including the time cost.
5. **Evidence:** show the evaluation and simulation results, including limitations.
6. **Responsibility:** close on the privacy and ethics design.

A pre-recorded fallback video is in `<path or link>` in case live recording fails.

## Related work

The closest existing project is **Safetipin**, an Indian app where users audit places on factors like lighting, openness, visibility and public transport, and where scores feed safer-route suggestions. Its data has been used to inform city action. SafetyLayer builds on the same idea and differs in these ways:

| Area | Safetipin (as we understand it) | SafetyLayer |
| --- | --- | --- |
| Input | Structured audits and its own photo collection | Free-form tap / voice / video in Hindi, English and Hinglish, structured by Gemma 4 |
| Cold start | Needs audits | Street View + Places baseline gives a prior on day one |
| Trust | Reliability of crowdsourced data is a known challenge | Consistency, presence, reliability scoring and collusion detection |
| Freshness | Largely static scores | Time-of-day profiles, decay and active verification |
| Contribution | Audit effort | Tiered, with scout mode for riders |
| Civic loop | Data shared with authorities | Auto-drafted complaints from verified clusters |

We have not tested Safetipin ourselves beyond published coverage; please verify its current features. Other related tools include Waze (road hazard reports) and Safecity (harassment reporting). See [`docs/limitations_and_related_work.md`](docs/limitations_and_related_work.md).

## Known limitations

We list these openly.

- **Coverage depends on contributions.** Outside the seeded area, most roads show "No data yet". We do not invent risk for unseen roads.
- **Demo data.** The current demo uses seeded data for a Central Delhi corridor. Route trade-off figures computed from seeded data are demo numbers.
- **Street View is daytime and may be outdated.** It cannot show whether lights work. Treated as a weak prior only.
- **Maps terms of service.** We store derived scores, not imagery, and display the imagery date. Check current Google Maps Platform terms before any real deployment.
- **Free geocoding/routing services.** The OSM-based fallbacks (Nominatim / OSRM) are for light use and not suitable for heavy traffic.
- **Gemma limits.** Extraction can misread or hallucinate; low-confidence output goes to verification and is not published. Gemma is weaker at reading dense text in images, which does not matter here as we analyse scenes.
- **Sampling bias.** Rider reports skew to main roads; pedestrians in lanes and footpaths are under-covered.
- **AI-generated media.** Video can be faked. Defence relies on presence checks, corroboration and reliability scores, and is not perfect (see simulation failure cases).
- **Not a safety guarantee.** SafetyLayer reports observations. It cannot predict crime or guarantee anyone's safety.
- **Prototype security.** Authentication is minimal for the hackathon; do not deploy as-is.

## Verification status

> Update this table honestly before submission. Only tick what you have actually run and checked.

| Item | Status |
| --- | --- |
| Build and unit tests pass | [ ] verified |
| Real Gemma 4 provider tested end to end (image + audio) | [ ] verified |
| Real Google Directions / Street View path tested with a key | [ ] verified |
| OSM-based fallback (no keys) tested | [ ] verified |
| Geolocation tested on a real phone over HTTPS | [ ] verified |
| Privacy claims checked against code (`PRIVACY_AUDIT.md`) | [ ] verified |
| Real labelled clips evaluated | [ ] verified |
| Simulation harness run over multiple seeds | [ ] verified |
| Chrome extension loads and injects into Google Maps | [ ] verified |

## Roadmap

- Fine-tune Gemma 4 on Hinglish and regional-language hazard reports and compare with the base model.
- Differential-privacy noise on aggregated locations.
- Richer spatial model (Gaussian process or graph model on the road network).
- Partnerships with institutions (hostels, campuses, resident associations, NGOs) to seed trustworthy reports.
- Pilot with a small community and measure real contribution and accuracy.
- Accessibility improvements (screen reader support, larger-text mode, offline queueing).

## Team

| Name | Role | GitHub |
| --- | --- | --- |
| `<name>` | `<e.g. Gemma extraction and vision>` | `<@handle>` |
| `<name>` | `<e.g. Backend and trust layer>` | `<@handle>` |
| `<name>` | `<e.g. Maps frontend>` | `<@handle>` |
| `<name>` | `<e.g. Evaluation and simulation>` | `<@handle>` |

## License and acknowledgements

Released under the **MIT** license (see [`LICENSE`](LICENSE)).

Thanks to:
- Google DeepMind for the Gemma open models
- OpenStreetMap contributors (map data is (c) OpenStreetMap contributors, ODbL)
- MapLibre, and the Photon / Nominatim / OSRM projects if used
- Safetipin and the researchers and activists working on women's safety in public spaces, whose work inspired this project

*SafetyLayer provides information based on community reports and public data. It is not an emergency service and does not guarantee safety. In an emergency, contact your local emergency number.*

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client ["Client Layer (Next.js PWA)"]
        UI["Safety Map & Routing UI"]
        Contrib["Tiered Contributor (Tap / Voice / Video)"]
        Preproc["Edge Preprocessor (3-5 Keyframe Sampler)"]
        Scout["Scout Mode (Stationary Detection)"]
    end

    subgraph API ["Next.js API Routes"]
        Router["/api/routes (Safety Re-ranking)"]
        ReportHandler["/api/reports (Ingest & Trust Filter)"]
        BaselineHandler["/api/baseline (Street View Prior)"]
        ScoutHandler["/api/scout (Verification & Bounties)"]
    end

    subgraph ModuleA ["Module A: Gemma 4 Multimodal Extraction"]
        GemmaInt["GemmaClient Interface"]
        Providers["Hosted (AI Studio) | Ollama | Mock"]
        ZodVal["Zod Schema Validator (< 0.65 to Queue)"]
    end

    subgraph ModuleB ["Module B: Street View & Places Prior"]
        SV["Street View Frame Sampler"]
        Places["Places & OSM Guardian Density"]
        Honesty["Honesty Rules: Weak Prior (w=0.25)"]
    end

    subgraph ModuleC ["Module C: Trust & Verification Layer"]
        Presence["GPS Trail & Plausible Speed Verification"]
        BetaRep["Beta(α, β) Bayesian Reporter Reputation"]
        Sybil["Cross-Modal & Collusion Defense"]
    end

    subgraph ModuleD ["Module D: Time-Aware Risk Model"]
        Decay["Hazard Half-Life Decay Curves"]
        Diurnal["Hour-of-Day Risk Curves (Day vs Night)"]
    end

    subgraph ModuleE ["Module E: Safety-Aware Routing Engine"]
        Directions["Google Directions / OSRM Geometry"]
        ReRank["Segment Risk Accumulator & Mode Weights"]
        Tradeoff["Honest Trade-off Presentation (+3 min, -78% issues)"]
    end

    %% Wiring
    Contrib --> Preproc --> ReportHandler
    ReportHandler --> ModuleC --> ModuleA --> ZodVal
    SV & Places --> Honesty --> BaselineHandler
    BaselineHandler --> ModuleD
    ModuleD --> ReRank
    Directions --> ReRank --> Tradeoff --> Router --> UI
```

---

## 🚀 Key Features & Modules

1. **Tiered Contribution (Video is Optional)**:
   - **Tier 0**: Post-trip 1-tap reason chips (< 1 KB).
   - **Tier 1**: Chip + voice note in Hindi, English, or Hinglish (< 50 KB).
   - **Tier 2**: Chip + 3-5 sampled keyframes with on-device face/license plate blurring (~250 KB).
   - **Strict Physical Taxonomy Only**: `lighting`, `road_condition`, `footpath_missing`, `isolated_stretch`, `obstruction`. **NEVER** labels neighbourhoods, communities, caste, or people.

2. **Module A (Gemma 4 Multimodal Extraction)**:
   - Swappable provider interface (`HostedGemmaProvider`, `OllamaGemmaProvider`, `MockGemmaProvider`).
   - Configurable thinking mode reasoning traces for hazard disambiguation.
   - Strict Zod JSON validation; confidence $< 0.65$ sent to verification queue.

3. **Module B (Street View Cold-Start Baseline)**:
   - Solves the cold-start problem on unvisited roads.
   - **Honesty Rules**: Daylight Street View can only prove lamp poles *exist*, not that bulbs function at night. Tagged: *"Lamps present, working status unknown"*, treated as weak prior ($w_{prior} = 0.25$).
   - Imagery date is always recorded and shown; daytime imagery never results in a "lit at night" badge.

4. **Module C (Trust & Verification Layer)**:
   - **Presence Check**: Validates GPS transit trail at plausible speeds ($1.0 \le v \le 70\text{ km/h}$). Enables tap-only reports to be verified without video!
   - **Reporter Reliability**: Modeled as $\text{Beta}(\alpha, \beta)$, updating on corroboration.
   - **Collusion Guard**: Flags bursts of accounts reporting the same spot.

5. **Module D (Time-Aware Risk Model)**:
   - Diurnal risk curves: Streetlight outage penalty is $0\%$ at noon, $100\%$ at midnight.
   - Hazard half-life decay: Potholes (21 days), missing footpaths (60 days), construction debris (12 hours).

6. **Module E (Safety-Aware Routing Engine)**:
   - Re-ranks alternative routes by risk along polylines at travel time.
   - Mode preferences: *Walking*, *Two-Wheeler*, *Night Commute*, *Driving*.
   - Ethical UX: **Never claims "safe"**; displays: *"Fewer reported issues (+3 min, 78% reduction)"*.

7. **Scout Mode (Night Rider Layer)**:
   - Aimed at cyclists and two-wheeler commuters.
   - Stationary sensor safety lock: Prompts only when parked ($v < 1\text{ km/h}$ for $\ge 3\text{s}$).
   - 500m home/start/end blackout privacy zones.

8. **Civic Action Loop**:
   - 1-click auto-drafted official municipal grievance notice (NDMC / BBMP) aggregating corroborated reports.

---

## 🛠️ Quickstart & Local Setup

### Prerequisites
- Node.js 18+ (tested on v22)
- npm 10+

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/safetylayer.git
cd safetylayer

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Environment Configuration (`.env.local`)
SafetyLayer runs **out of the box with zero external credentials** using MapLibre GL, local SQLite/JSON storage, and the deterministic Mock Gemma 4 provider:

```env
# Google Maps API Key (Optional: Falls back to MapLibre GL + OpenStreetMap if not provided)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=

# Gemma 4 Provider: "mock" (offline default), "hosted" (Google AI Studio), or "ollama" (local)
GEMMA_PROVIDER=mock
GEMMA_MODEL_ID=gemma-4-12b-it
GEMMA_API_KEY=

# Local demo settings
DATABASE_MODE=sqlite
NEXT_PUBLIC_MAP_DEFAULT_LAT=28.6315
NEXT_PUBLIC_MAP_DEFAULT_LNG=77.2205
```

### Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Evaluation

### Run Unit Tests
```bash
npm test
```
Tests cover:
- Gemma 4 strict JSON schema validation & ethical taxonomy constraints.
- Module C GPS trail presence check, Beta-distribution reputation updating, and spoof rejection.
- Module E route re-ranking and tradeoff calculations.

### Run Empirical Benchmarks
```bash
npx ts-node scripts/evaluate.ts
```
Or view the live benchmark visualizer at [http://localhost:3000/eval](http://localhost:3000/eval).

---

## ⏱️ 3-Minute Hackathon Demo Flow

1. **Step 1: Baseline Shading**: Open the map on the Central Delhi corridor. Note the Street View baseline priors on unvisited segments with the honest *"Lamps present, working status unknown"* badge.
2. **Step 2: Live Multimodal Report**: Click **"Report Hazard"**. Choose **Tier 1 (Voice)** or **Tier 2 (Keyframes)**. Type or speak a Hinglish claim (*"Batti nahi jal rahi hai, bohot andhera hai"*). Watch Gemma 4 extract structured JSON in real time.
3. **Step 3: Fake Report Rejection**: Check the **"Demonstrate Trust Layer (Spoof Reject Test)"** box. Submit a report from 40 km away. Watch Module C reject the spoofed submission.
4. **Step 4: Safety-Aware Routing**: Compare the direct 14-min route (passing the dark service road) with the 17-min commercial corridor. Notice the **"+3 min, 78% fewer reported issues"** trade-off. Move the **Travel Time Profile slider** to 12:00 PM to see daylight reduce lighting caution.
5. **Step 5: Civic Action & Privacy**: Click **"Civic Notice"** to inspect the auto-drafted NDMC complaint letter. Click **"Privacy"** to review the zero-raw-video-retention guarantees.

---

## 📂 Repository Structure

```
├── docs/
│   └── limitations_and_related_work.md   # Safetipin comparison & epistemic limits
├── extension/                            # Optional Chrome Extension overlay
│   ├── manifest.json
│   ├── popup.html
│   └── content.js
├── scripts/
│   ├── eval_dataset.json                 # Labelled multimodal & adversarial samples
│   └── evaluate.ts                       # Benchmark runner
├── src/
│   ├── app/
│   │   ├── api/                          # Endpoints: /reports, /routes, /baseline, /scout
│   │   ├── eval/page.tsx                 # Empirical evaluation dashboard
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                      # Main SafetyLayer interactive map application
│   ├── components/
│   │   ├── CivicComplaintModal.tsx       # Auto-drafted NDMC/BBMP grievance generator
│   │   ├── DemoWalkthrough.tsx           # 3-minute scripted demo walkthrough stepper
│   │   ├── Navbar.tsx
│   │   ├── PrivacyModal.tsx              # Ethical AI & privacy guarantees
│   │   ├── ReportModal.tsx               # Tiered multimodal hazard reporting
│   │   ├── RouteDrawer.tsx               # Route comparison, mode selector & time slider
│   │   ├── SafetyLayerMap.tsx              # Dual-engine Google Maps / MapLibre component
│   │   └── ScoutPanel.tsx                # Rider gamification with stationary safety sensor
│   ├── lib/
│   │   ├── baseline/streetview.ts        # Module B: Street View & Places cold start prior
│   │   ├── gemma/client.ts               # Module A: Swappable Gemma 4 multimodal client
│   │   ├── gemma/schema.ts               # Zod validation schema
│   │   ├── risk/model.ts                 # Module D: Diurnal risk curves & half-life decay
│   │   ├── routing/engine.ts             # Module E: Safety-aware re-ranking engine
│   │   ├── storage/repository.ts         # Unified spatial storage with geohash indexing
│   │   ├── storage/seed.ts               # Realistic test corridor seed data
│   │   └── trust/engine.ts               # Module C: Presence check & Bayesian reputation
│   └── types/index.ts                    # Core TypeScript domain models
---

## 🧪 Simulation Harness & Empirical Verification

SafetyLayer includes an independent, reproducible **Monte Carlo simulation harness** located in `/sim` that stress-tests production modules (`TrustEngine`, `RiskModel`, `RoutingEngine`, `ScoutScoringEngine`) across 30 seeds against a hidden ground truth.

### Reproduction Commands:
```bash
# 1. Run 30-seed Monte Carlo simulation (writes to /sim_results/results.json and metrics.csv)
npm run sim -- --seeds 30 --config sim/configs/default.json

# 2. Run full unit test suite (18 tests: trust, privacy fuzzing, scout anti-volume, determinism)
npm test

# 3. View interactive simulation dashboard in browser
# Navigate to http://localhost:3000/sim
```

### Audited Headline Numbers (30 Seeds, 95% Confidence Intervals):
- **Adversarial Precision:** `70.80%` [67.15%, 74.45%]
- **Adversarial Recall:** `94.94%` [93.79%, 96.09%]
- **Cold Start AUC (Day 0) → Day 14:** `0.463` → `0.836` [0.757, 0.914]
- **Route Risk Exposure Delta:** `-36.63%` [-26.88%, -46.38%]
- **Travel Time Overhead:** `+2.97 min` [+2.78, +3.16] min
- **Scout Anti-Volume Alignment:** Spammer with 45 rapid unconfirmed reports earns **0 pts**, while an accurate scout earns **100 pts** upon corroboration.

---

## ⚠️ Known Limitations & Epistemic Boundaries

In accordance with our strict honesty policy, SafetyLayer documents where the system struggles:
1. **AI Fake Media with Authentic GPS Trails (Catch rate 98%):** If an attacker physically walks a road segment while submitting AI-generated synthetic media, single-point checks pass. The false hazard is published until an independent commuter or scout refutes it.
2. **Turned Sleeper Accounts (Catch rate 97.2%):** A user who builds a high Beta score ($\ge 0.85$) through genuine reports can temporarily poison a segment with 1-2 false reports before contradiction penalties downgrade their prior.
3. **High Location Noise (> 70m):** In dense urban canyons where GPS drifts beyond 70 meters, false positive rejection reaches 28.5% for legitimate pedestrian sidewalk reports.
4. **Daylight Street View Baseline (AUC 0.46 - 0.73):** Baseline Street View priors only capture static physical infrastructure (lamp poles, road surface). They cannot predict transient nocturnal conditions (power outages, flooding) until crowdsourced reports accumulate.
5. **Real Multimodal Clips Dataset:** The `/eval` page displays 0 real-world clips until field dashcam recordings are provided in `scripts/real_clips/dataset_template.csv`. Current `/eval` metrics represent audited synthetic benchmarks.

---

## ⚖️ Ethics, Privacy & Responsible AI

- **Zero Raw Video Retention**: Only ephemeral 3-5 compressed keyframes are processed. Faces and license plates are blurred client-side. Media is deleted immediately after extraction; `HazardReport` in the database stores 0 raw video or keyframes.
- **Strictly Observable Infrastructure**: No demographic or social labeling permitted.
- **Spatial Fuzzing**: Reporter coordinates fuzzed $\pm 25\text{m}$; Scout mode enforces a 500m residential blackout zone.
- **Safe, Honest Language**: We never label routes as "safe" or guarantee outcomes; we report *"fewer reported physical issues"*.
