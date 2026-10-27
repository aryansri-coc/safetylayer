import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  const jsonPath = path.resolve(process.cwd(), "sim_results/results.json");

  try {
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: "Simulation results not generated yet. Run 'npm run sim' to generate." },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  const jsonPath = path.resolve(process.cwd(), "sim_results/results.json");

  try {
    // Execute CLI runner asynchronously in background without importing /sim into production bundle
    await execAsync("npx tsx sim/runner.ts --seeds 30 --config sim/configs/default.json");

    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Simulation run completed but results file missing" }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
