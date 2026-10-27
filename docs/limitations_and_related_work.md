# SafetyLayer: Limitations & Related Work

## 1. Related Work & Comparison with Safetipin

The closest existing platform to SafetyLayer is **Safetipin**, a pioneer in women's safety mapping that scores urban public spaces along 9 safety audit parameters (lighting, openness, visibility, people, security, walk path, transport, feeling, gender diversity).

While Safetipin established the foundation for safety-informed urban mobility, SafetyLayer introduces several fundamental structural and architectural advancements:

| Dimension | Safetipin | SafetyLayer (Our System) |
| :--- | :--- | :--- |
| **Input Modality** | Structured questionnaire audits & vehicle-mounted phone cameras running proprietary models | **Free-form multimodal Hinglish/Hindi/English voice notes, 3-5 sampled keyframes, or 1-tap chips** processed via **Gemma 4** unified multimodal reasoning |
| **Cold Start Handling** | Requires manual vehicle sweeps or human auditors before scoring is available | **Automated Street View Baseline Prior (Module B)** combined with OpenStreetMap/Places signals (24/7 commercial stores, hospitals, police stations) with strict honesty rules |
| **Data Veracity & Trust** | Assumes good-faith audited input; vulnerable to remote spam if open crowdsourced | **Multi-tier Trust Layer (Module C)**: Plausible travel speed + GPS trail presence check (allowing tap-only reports to be verified), Beta(α, β) Bayesian reporter reliability, and cross-modal consistency check |
| **Temporal Dynamics** | Static audit score per road segment | **Continuous Diurnal Time-Aware Risk Model (Module D)**: Hour-of-day hazard curves (e.g. lighting penalty = 0% at noon, 100% at midnight) with half-life decay rates |
| **Rider Community** | Passive traveler view | **Gamified Scout Mode (Tier 3)**: Stationary-enforced verification for cyclists and delivery riders with 500m home privacy blackout zones |
| **Civic Action Loop** | Periodic institutional reports | **Auto-drafted Municipal Notice (Module 9)**: 1-click official grievance drafting (NDMC/BBMP) with corroborated timestamped evidence |

---

## 2. Limitations & Boundary Conditions

### 2.1 The Street View Daylight Epistemic Gap (Honesty Rule)
- **Constraint**: Google Street View panoramas are captured almost exclusively during daylight hours and may be between 6 and 24 months old.
- **Epistemic Boundary**: A daytime panoramic image can confirm that streetlight poles and fixtures *physically exist*, but it cannot prove whether electricity is supplied or bulbs function at 22:00.
- **System Mitigation**: SafetyLayer treats Street View strictly as a **weak prior ($w_{prior} = 0.25$)** labeled explicitly in the UI as *"Lamps present, working status unknown"*. We enforce a rule that no road segment can be classified as "lit at night" without nocturnal user evidence. Fresh user reports immediately override this prior.

### 2.2 Socio-Spatial Reporting Skew & Demographic Neutrality
- **Risk of Stereotype Amplification**: Crowd-sourced platforms can inadvertently reproduce racial, caste, or class-based prejudice if users label poorer neighbourhoods as "unsafe" simply due to demographic composition.
- **Architectural Safeguard**:
  1. SafetyLayer's taxonomy permits **ONLY concrete, physical infrastructure hazards**: `lighting`, `road_condition`, `footpath_missing`, `isolated_stretch`, `obstruction`.
  2. Gemma 4 system prompts enforce negative constraints that explicitly reject any characterization of people, caste, religion, or community identities.
  3. Algorithmic fairness audits compare baseline hazard scores with commercial footfall to ensure active street-vendor markets are not penalized.

### 2.3 Sensor & GPS Jitter
- **Constraint**: Dense urban high-rises create multipath GPS reflections that can introduce 15–30 meter spatial jitter.
- **System Mitigation**: The presence check employs a generous 70-meter buffer around road segment polylines rather than requiring sub-meter accuracy.

### 2.4 Device Tier Guarantees
- **Accurate Privacy Claim**: While our Edge tier (Gemma 4 E2B/E4B) processes reports entirely on-device, mid-tier and web-based browsers sample 3–5 keyframes and compressed audio, which are sent via TLS to the server. We strictly advertise: *"Raw video is never stored; minimal keyframe snippets are permanently purged post-inference."*
