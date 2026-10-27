import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUTPUT_DIR = "C:\\Users\\ARYAN\\.gemini\\antigravity-ide\\brain\\96de8c77-813f-486f-aa64-419e5e991397\\screenshots";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Dismiss welcome
    const dismissBtn = await page.$('button ::-p-text("Got it, let\'s explore")');
    if (dismissBtn) await dismissBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // 1. Clear destination and type "Janpath" for clean autocomplete dropdown
    const clearBtn = await page.$('button[title="Clear destination"]');
    if (clearBtn) await clearBtn.click();

    const searchInput = await page.$("#destination-search-input");
    if (searchInput) {
      await searchInput.click();
      await searchInput.type("Janpath", { delay: 100 });
      await new Promise((r) => setTimeout(r, 1500)); // wait for Photon response

      const p1 = path.join(OUTPUT_DIR, "desktop_autocomplete_clean.png");
      await page.screenshot({ path: p1 });
      console.log("Saved:", p1);

      // Select "Janpath"
      const janpathOption = await page.$('button ::-p-text("Janpath")');
      if (janpathOption) {
        await janpathOption.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    // 2. Test Unmapped Destination (Outside demo area - e.g. "Noida")
    const clearBtn2 = await page.$('button[title="Clear destination"]');
    if (clearBtn2) await clearBtn2.click();

    if (searchInput) {
      await searchInput.click();
      await searchInput.type("Sector 62 Noida", { delay: 80 });
      await new Promise((r) => setTimeout(r, 1500));

      const noidaOption = await page.$('button ::-p-text("Sector 62")') || await page.$('button ::-p-text("Noida")');
      if (noidaOption) {
        await noidaOption.click();
        await new Promise((r) => setTimeout(r, 2000));

        const p2 = path.join(OUTPUT_DIR, "unmapped_outside_demo_area.png");
        await page.screenshot({ path: p2 });
        console.log("Saved:", p2);
      }
    }

    await page.close();
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
}

main();
