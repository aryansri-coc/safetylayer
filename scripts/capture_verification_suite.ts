import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_DIR = "C:\\Users\\ARYAN\\.gemini\\antigravity-ide\\brain\\96de8c77-813f-486f-aa64-419e5e991397\\screenshots";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureSuite() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Launching Edge from:", EDGE_PATH);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });

  try {
    // ==========================================
    // 1. DESKTOP VIEWPORT (1440 x 900)
    // ==========================================
    console.log("\n--- Capturing Desktop Viewport (1440 x 900) ---");
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Ensure clean state (welcome card visible)
    await desktopPage.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 30000 });
    await desktopPage.evaluate(() => {
      localStorage.removeItem("safetylayer_welcome_dismissed");
    });
    await desktopPage.reload({ waitUntil: "networkidle2" });
    await sleep(2500);

    // 1. Welcome Screen
    const dWelcome = path.join(OUTPUT_DIR, "desktop_1_welcome.png");
    await desktopPage.screenshot({ path: dWelcome });
    console.log("Saved:", dWelcome);

    // Dismiss Welcome card
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const dismissBtn = btns.find((b) => b.textContent?.includes("Got it, let's explore"));
      if (dismissBtn) dismissBtn.click();
    });
    await sleep(1000);

    // 2. Computed Route - Walk
    // Click "Get routes"
    await desktopPage.evaluate(() => {
      const getRoutesBtn = document.querySelector("#get-routes-button") as HTMLButtonElement;
      if (getRoutesBtn) getRoutesBtn.click();
    });
    await sleep(3500); // Allow routes API to complete

    // Select Walk mode explicitly
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const walkBtn = btns.find((b) => b.textContent?.trim() === "Walk");
      if (walkBtn) walkBtn.click();
    });
    await sleep(2500);

    const dWalk = path.join(OUTPUT_DIR, "desktop_2_route_walk.png");
    await desktopPage.screenshot({ path: dWalk });
    console.log("Saved:", dWalk);

    // 3. Computed Route - Two-wheeler
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const bikeBtn = btns.find((b) => b.textContent?.includes("Two-wheeler"));
      if (bikeBtn) bikeBtn.click();
    });
    await sleep(2500);

    const dBike = path.join(OUTPUT_DIR, "desktop_3_route_two_wheeler.png");
    await desktopPage.screenshot({ path: dBike });
    console.log("Saved:", dBike);

    // 4. Computed Route - Vehicle
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const carBtn = btns.find((b) => b.textContent?.includes("Vehicle"));
      if (carBtn) carBtn.click();
    });
    await sleep(2500);

    const dCar = path.join(OUTPUT_DIR, "desktop_4_route_vehicle.png");
    await desktopPage.screenshot({ path: dCar });
    console.log("Saved:", dCar);

    // 5. More Menu (Desktop Dropdown)
    await desktopPage.evaluate(() => {
      const moreBtn = document.querySelector("#more-menu-button") as HTMLButtonElement;
      if (moreBtn) moreBtn.click();
    });
    await sleep(1200);

    const dMore = path.join(OUTPUT_DIR, "desktop_5_more_menu.png");
    await desktopPage.screenshot({ path: dMore });
    console.log("Saved:", dMore);

    // Close More Menu
    await desktopPage.keyboard.press("Escape");
    await sleep(600);

    // 6. Hazard Sheet (Click on a hazard chip inside RouteDrawer)
    await desktopPage.evaluate(() => {
      const chips = Array.from(document.querySelectorAll("button"));
      const chip = chips.find(
        (b) =>
          b.textContent?.includes("Lighting") ||
          b.textContent?.includes("Road Condition") ||
          b.textContent?.includes("Isolated")
      );
      if (chip) chip.click();
    });
    await sleep(1200);

    const dHazard = path.join(OUTPUT_DIR, "desktop_6_hazard_sheet.png");
    await desktopPage.screenshot({ path: dHazard });
    console.log("Saved:", dHazard);

    // Close Hazard Sheet
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const closeBtn = btns.find((b) => b.getAttribute("aria-label")?.includes("Close") || b.title?.includes("Close"));
      if (closeBtn) closeBtn.click();
    });
    await sleep(600);

    // 7. Route outside demo area with "No data yet"
    await desktopPage.evaluate(async () => {
      const destInput = document.querySelector("#destination-search-input") as HTMLInputElement;
      if (destInput) {
        destInput.value = "Rohini Sector 10";
        destInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await sleep(1500);

    await desktopPage.evaluate(() => {
      const suggestions = Array.from(document.querySelectorAll("button"));
      const rohinisugg = suggestions.find((b) => b.textContent?.includes("Rohini"));
      if (rohinisugg) rohinisugg.click();
    });
    await sleep(3500);

    const dUnmapped = path.join(OUTPUT_DIR, "desktop_7_route_outside_demo.png");
    await desktopPage.screenshot({ path: dUnmapped });
    console.log("Saved:", dUnmapped);

    // 8. Report Modal
    await desktopPage.evaluate(() => {
      const reportBtn = document.querySelector("#report-hazard-button") as HTMLButtonElement;
      if (reportBtn) reportBtn.click();
    });
    await sleep(1200);

    const dReport = path.join(OUTPUT_DIR, "desktop_8_report_modal.png");
    await desktopPage.screenshot({ path: dReport });
    console.log("Saved:", dReport);

    await desktopPage.close();

    // ==========================================
    // 2. MOBILE VIEWPORT (390 x 844)
    // ==========================================
    console.log("\n--- Capturing Mobile Viewport (390 x 844) ---");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

    // Clean state for mobile welcome
    await mobilePage.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 30000 });
    await mobilePage.evaluate(() => {
      localStorage.removeItem("safetylayer_welcome_dismissed");
    });
    await mobilePage.reload({ waitUntil: "networkidle2" });
    await sleep(2500);

    // 1. Mobile Welcome
    const mWelcome = path.join(OUTPUT_DIR, "mobile_1_welcome.png");
    await mobilePage.screenshot({ path: mWelcome });
    console.log("Saved:", mWelcome);

    // Dismiss Welcome
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const dismissBtn = btns.find((b) => b.textContent?.includes("Got it, let's explore"));
      if (dismissBtn) dismissBtn.click();
    });
    await sleep(1000);

    // 2. Mobile Route - Walk
    await mobilePage.evaluate(() => {
      const getRoutesBtn = document.querySelector("#get-routes-button") as HTMLButtonElement;
      if (getRoutesBtn) getRoutesBtn.click();
    });
    await sleep(3500);

    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const walkBtn = btns.find((b) => b.textContent?.trim() === "Walk");
      if (walkBtn) walkBtn.click();
    });
    await sleep(2500);

    const mWalk = path.join(OUTPUT_DIR, "mobile_2_route_walk.png");
    await mobilePage.screenshot({ path: mWalk });
    console.log("Saved:", mWalk);

    // 3. Mobile Route - Two-wheeler
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const bikeBtn = btns.find((b) => b.textContent?.includes("Two-wheeler"));
      if (bikeBtn) bikeBtn.click();
    });
    await sleep(2500);

    const mBike = path.join(OUTPUT_DIR, "mobile_3_route_two_wheeler.png");
    await mobilePage.screenshot({ path: mBike });
    console.log("Saved:", mBike);

    // 4. Mobile Route - Vehicle
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const carBtn = btns.find((b) => b.textContent?.includes("Vehicle"));
      if (carBtn) carBtn.click();
    });
    await sleep(2500);

    const mCar = path.join(OUTPUT_DIR, "mobile_4_route_vehicle.png");
    await mobilePage.screenshot({ path: mCar });
    console.log("Saved:", mCar);

    // 5. Mobile More Menu (Bottom Sheet)
    await mobilePage.evaluate(() => {
      const moreBtn = document.querySelector("#more-menu-button") as HTMLButtonElement;
      if (moreBtn) moreBtn.click();
    });
    await sleep(1200);

    const mMore = path.join(OUTPUT_DIR, "mobile_5_more_menu.png");
    await mobilePage.screenshot({ path: mMore });
    console.log("Saved:", mMore);

    // Close Mobile More Menu
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const closeBtn = btns.find((b) => b.getAttribute("aria-label")?.includes("Close menu"));
      if (closeBtn) closeBtn.click();
    });
    await sleep(600);

    // 6. Mobile Hazard Sheet
    await mobilePage.evaluate(() => {
      const chips = Array.from(document.querySelectorAll("button"));
      const chip = chips.find(
        (b) =>
          b.textContent?.includes("Lighting") ||
          b.textContent?.includes("Road Condition") ||
          b.textContent?.includes("Isolated")
      );
      if (chip) chip.click();
    });
    await sleep(1200);

    const mHazard = path.join(OUTPUT_DIR, "mobile_6_hazard_sheet.png");
    await mobilePage.screenshot({ path: mHazard });
    console.log("Saved:", mHazard);

    // Close Hazard Sheet
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const closeBtn = btns.find((b) => b.getAttribute("aria-label")?.includes("Close") || b.title?.includes("Close"));
      if (closeBtn) closeBtn.click();
    });
    await sleep(600);

    // 7. Mobile Route outside demo area with "No data yet"
    await mobilePage.evaluate(async () => {
      const destInput = document.querySelector("#destination-search-input") as HTMLInputElement;
      if (destInput) {
        destInput.value = "Rohini Sector 10";
        destInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await sleep(1500);

    await mobilePage.evaluate(() => {
      const suggestions = Array.from(document.querySelectorAll("button"));
      const rohinisugg = suggestions.find((b) => b.textContent?.includes("Rohini"));
      if (rohinisugg) rohinisugg.click();
    });
    await sleep(3500);

    const mUnmapped = path.join(OUTPUT_DIR, "mobile_7_route_outside_demo.png");
    await mobilePage.screenshot({ path: mUnmapped });
    console.log("Saved:", mUnmapped);

    // 8. Mobile Report Modal
    await mobilePage.evaluate(() => {
      const reportBtn = document.querySelector("#report-hazard-button") as HTMLButtonElement;
      if (reportBtn) reportBtn.click();
    });
    await sleep(1200);

    const mReport = path.join(OUTPUT_DIR, "mobile_8_report_modal.png");
    await mobilePage.screenshot({ path: mReport });
    console.log("Saved:", mReport);

    await mobilePage.close();
    console.log("\n✅ All 16 verification screenshots captured successfully!");
  } finally {
    await browser.close();
  }
}

captureSuite().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
