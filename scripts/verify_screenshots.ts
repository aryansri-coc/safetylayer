import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_DIR = "C:\\Users\\ARYAN\\.gemini\\antigravity-ide\\brain\\96de8c77-813f-486f-aa64-419e5e991397\\screenshots";

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Launching Edge at:", EDGE_PATH);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    // 1. DESKTOP VIEWPORT (1280 x 800)
    console.log("Testing Desktop Viewport...");
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 800 });

    await desktopPage.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Capture initial desktop with Welcome Card & Search bar
    const p1 = path.join(OUTPUT_DIR, "desktop_1_welcome_view.png");
    await desktopPage.screenshot({ path: p1 });
    console.log("Saved:", p1);

    // Dismiss Welcome card
    const dismissBtn = await desktopPage.$('button ::-p-text("Got it, let\'s explore")');
    if (dismissBtn) {
      await dismissBtn.click();
      await new Promise((r) => setTimeout(r, 500));
    }

    // Type in search bar to test debounced autocomplete
    const searchInput = await desktopPage.$("#destination-search-input");
    if (searchInput) {
      await searchInput.click();
      await searchInput.type("Connaught", { delay: 100 });
      await new Promise((r) => setTimeout(r, 1200)); // wait for Photon response

      const p2 = path.join(OUTPUT_DIR, "desktop_2_search_suggestions.png");
      await desktopPage.screenshot({ path: p2 });
      console.log("Saved:", p2);

      // Click on a suggestion
      const suggestion = await desktopPage.$('button ::-p-text("Connaught Place")');
      if (suggestion) {
        await suggestion.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    // Capture Route Options & map
    const p3 = path.join(OUTPUT_DIR, "desktop_3_route_options.png");
    await desktopPage.screenshot({ path: p3 });
    console.log("Saved:", p3);

    // Open More Menu
    const moreMenuBtn = await desktopPage.$('button[title="More tools and options"]');
    if (moreMenuBtn) {
      await moreMenuBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      const p4 = path.join(OUTPUT_DIR, "desktop_4_more_menu.png");
      await desktopPage.screenshot({ path: p4 });
      console.log("Saved:", p4);

      // Open Developer Info modal
      const devInfoBtn = await desktopPage.$('button ::-p-text("About / Developer Info")');
      if (devInfoBtn) {
        await devInfoBtn.click();
        await new Promise((r) => setTimeout(r, 600));

        const p5 = path.join(OUTPUT_DIR, "desktop_5_developer_info.png");
        await desktopPage.screenshot({ path: p5 });
        console.log("Saved:", p5);

        // Close Developer Info
        const closeDevBtn = await desktopPage.$('button ::-p-text("Close")');
        if (closeDevBtn) await closeDevBtn.click();
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Open Report Modal
    const reportBtn = await desktopPage.$('button ::-p-text("Report an issue")');
    if (reportBtn) {
      await reportBtn.click();
      await new Promise((r) => setTimeout(r, 800));

      const p6 = path.join(OUTPUT_DIR, "desktop_6_report_modal.png");
      await desktopPage.screenshot({ path: p6 });
      console.log("Saved:", p6);

      // Close Report Modal
      const cancelBtn = await desktopPage.$('button ::-p-text("Cancel")');
      if (cancelBtn) await cancelBtn.click();
      await new Promise((r) => setTimeout(r, 500));
    }

    // Test Locate Me / GPS modal
    const locateBtn = await desktopPage.$('button[title="Locate me (GPS)"]');
    if (locateBtn) {
      await locateBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      const p7 = path.join(OUTPUT_DIR, "desktop_7_location_prompt.png");
      await desktopPage.screenshot({ path: p7 });
      console.log("Saved:", p7);

      const notNowBtn = await desktopPage.$('button ::-p-text("Not Now")');
      if (notNowBtn) await notNowBtn.click();
      await new Promise((r) => setTimeout(r, 500));
    }

    await desktopPage.close();

    // 2. MOBILE VIEWPORT (390 x 844 - iPhone 14/15)
    console.log("Testing Mobile Viewport (390x844)...");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await mobilePage.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Dismiss welcome card if present
    const mobileDismissBtn = await mobilePage.$('button ::-p-text("Got it, let\'s explore")');
    if (mobileDismissBtn) {
      await mobileDismissBtn.click();
      await new Promise((r) => setTimeout(r, 500));
    }

    const p8 = path.join(OUTPUT_DIR, "mobile_390px_primary_view.png");
    await mobilePage.screenshot({ path: p8 });
    console.log("Saved:", p8);

    await mobilePage.close();

    console.log("All visual verification screenshots captured successfully!");
  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    await browser.close();
  }
}

main();
