// Run locally: node frontend/scripts/check-env.mjs
// This verifies your local environment has the required server-side vars.
const required = ["BACKEND_API_URL"]
const missing = required.filter(k => !process.env[k])
if (missing.length) {
  console.error(`\n❌ Missing required environment variables:\n   ${missing.join("\n   ")}`)
  console.error("\nSet these in your .env.local file or Vercel dashboard.\n")
  process.exit(1)
}
console.log("✅ All required environment variables are set.")
