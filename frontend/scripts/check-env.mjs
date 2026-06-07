// Run locally: node frontend/scripts/check-env.mjs
// This verifies your local environment has the required server-side vars.
const required = ["BACKEND_API_URL"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  console.error("Set them in Vercel: Settings → Environment Variables");
  process.exit(1);
}
console.log("All required env vars present.");
