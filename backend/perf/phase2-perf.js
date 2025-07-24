// Simple performance smoke test for Phase-2 optimized endpoints
import autocannon from "autocannon";

async function run() {
  const url = process.env.PERF_TARGET || "http://localhost:7071/api/phase2-demo";
  const connections = Number(process.env.PERF_VUS || 100);
  const duration = Number(process.env.PERF_DURATION_SEC || 120);
  const threshold = Number(process.env.PERF_LATENCY_MS || 150);

  console.log(`Running perf test → ${connections} VUs for ${duration}s, threshold ${threshold}ms`);

  const result = await autocannon({
    url,
    connections,
    duration,
    pipelining: 1,
    method: "GET",
  });

  const avgLat = result.latency.average;
  console.log("Average latency:", avgLat, "ms");

  if (avgLat > threshold) {
    console.error(`Latency threshold of ${threshold}ms exceeded`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
}); 