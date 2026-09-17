# Environment recovery

EXACT: no import.meta.env, VITE_*, PUBLIC_*, API_URL or API base configuration names survive in application code. process/environment tests in spreadsheet and framework vendor code do not establish original project env variables. Compilation may have erased original variable names (UNKNOWN).

All application API calls use relative same-origin paths. .env.example contains only BACKEND_ORIGIN, an explicitly INFERRED, optional development proxy target introduced for running the recovered source against the real backend. It is not exposed in client code and has no default invented origin/port. Production deployment must serve /api on the same origin or configure its own reverse proxy. No secrets are included.

Node 24.21.0 and npm 11.19.0 were used for validation. On this Windows machine PowerShell blocks npm.ps1, so npm.cmd is used. Build outputs go only to frontend_reconstructed/build.
