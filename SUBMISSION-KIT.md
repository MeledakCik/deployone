# Depup connector: directory submission kit

Copy each block into the matching step of the developer portal (https://claude.ai/directory/manage -> Submit new -> MCP connector).
Character counts are checked against the limits in Anthropic's docs (name 100, one-liner 200, description 2000). Replace every `TODO`.

**Still to fill in by you (cannot be done from the code):** support contact confirmation, company name, review contact (name + email), reviewer Google account + password, and the GitHub username in the sample repo URL (search for `TODO`).

## Before you open the portal
- [ ] Production deployment is live with the latest code (`/api/mcp`, `/docs/mcp`, `/privacy`). The portal's Connection and Tools steps probe your **live** server, so deploy first. The latest code adds `Origin` header validation on `/api/mcp` (required by the directory checklist).
- [ ] Quick live check: `curl -i -X POST https://depup.cloud/api/mcp` returns `401` with a `WWW-Authenticate: Bearer resource_metadata=...` header; `curl -i -X POST -H 'Origin: https://evil.example' https://depup.cloud/api/mcp` returns `403`.
- [ ] The Google OAuth consent screen of the Depup login is **In production** (not "Testing"). In Testing mode only listed test users can sign in, so reviewers would be blocked.
- [ ] `MCP_REDIRECT_HOSTS` is not needed: `claude.ai` and `claude.com` callbacks are allowed by default.
- [ ] You added Depup as a custom connector in Claude and ran **every** tool at least once (portal step "Test & launch" asks you to confirm).
- [ ] Reviewer test account is ready (see below).
- [ ] Your Claude account is allowed to submit (any paid Claude plan; check "who can submit" in the docs).
- [ ] Pushed `reviewer-sample-repo/` as a public GitHub repo named `depup-reviewer-sample`.

## 3. Listing
**Server name** (5/100): `Depup`

**Tagline** (47/55): `Publish sites & deploy GitHub repos from Claude`

**One-liner** (141/200):
```
Publish a web page as an instant public link, or deploy a GitHub repo to Vercel, Cloudflare Pages or Railway, straight from your Claude chat.
```

**Description** (1302/2000):
```
Depup lets Claude put your work online.

Instant Links: ask Claude to build a page and publish it. Depup returns a public HTTPS link that expires automatically (1 hour to 7 days), so you can preview or share it without downloading or uploading anything.

Deploy from GitHub: ask Claude to deploy a repository to Vercel, Cloudflare Pages or Railway. Depup runs the deployment on your own platform account using tokens you save once in Depup Settings. Tokens are never typed into the chat and never returned to Claude.

You stay in control:
- Each platform is switched off by default. You turn on only the ones Claude may use, in Settings > Claude connector.
- Deploying is marked as a state-changing action, so Claude asks before running it.
- For Railway, Depup only commits missing files (such as a start script) to your repo after you approve them.
- You can revoke Claude's access at any time with one button.

Tools: deploy_website, list_websites, delete_website, connector_status, deploy_project.

Requirements: a free Depup account (Google sign-in). Deploying to a platform also needs a Vercel, Cloudflare or Railway account and an API token saved in Depup Settings; a GitHub token is only needed for private repositories.

Docs: https://depup.cloud/docs/mcp  Privacy: https://depup.cloud/privacy
```

**Categories (1-5):** Developer Tools; Productivity.
**Documentation URL:** https://depup.cloud/docs/mcp
**Privacy policy URL:** https://depup.cloud/privacy
**Support contact:** depupdev@gmail.com (TODO: confirm, or use a dedicated support address)
**Icon:** `public/icon-512.png` (also `public/icon-128.png`). It is the existing Depup logo.
**URL slug:** `depup`  (permanent once published. Alternatives if taken: `depup-deploy`, `depup-cloud`. Decide carefully.)

## 1. Connection
- Server URL: `https://depup.cloud/api/mcp`
- Transport: Streamable HTTP (JSON responses, no SSE, no session id).
- All users connect to the same URL (choose a single URL, not "Users connect to different URLs").
- Technical requirements the portal asks you to confirm: HTTPS (yes); OAuth 2.0 with PKCE (yes); `Origin` header validation (yes: requests with an `Origin` other than claude.ai / claude.com / loopback get 403; Claude's cloud sends none); every tool has `title` + `readOnlyHint`/`destructiveHint` (yes, covered by an automated test).

## 4. Use cases
1. Ask Claude to build a landing page and publish it as a temporary public link to preview or share.
2. Ask Claude to deploy a GitHub repo to Vercel, Cloudflare Pages or Railway, using the user's own saved tokens.
3. Review or clean up active instant links.

**Before connecting users need:** a Depup account (Google sign-in). For platform deploys: an account and API token on Vercel, Cloudflare or Railway saved in Depup Settings, and the platform switched on under Settings > Claude connector. A GitHub token only for private repos.
**Read / write:** both. `list_websites` and `connector_status` are read-only; the others write.

## 5. Company
- Company name: TODO
- Website: https://depup.cloud
- Primary contact for review updates: TODO (name + email)

## 6. Authentication
- Authentication requirement: required.
- Method: OAuth 2.0 authorization code + PKCE (S256), public client, dynamic client registration (`/api/mcp/oauth/register`).
- Metadata: `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource/api/mcp`.
- Allowed redirect hosts: claude.ai, claude.com (`https://claude.ai/api/mcp/auth_callback` and `https://claude.com/api/mcp/auth_callback`), plus loopback `http://localhost:*` for Claude Code and MCP Inspector (e.g. `http://localhost:6274/oauth/callback`).
- The portal's Tools step syncs the 5 tools from the live server; if any tool is flagged for a missing title or annotation, fix it on the server (none are flagged today).
- Access token 1 hour, refresh token 30 days, revocable by the user at any time.

## 7. Data handling
- **API ownership:** Instant Links (`deploy_website`, `list_websites`, `delete_website`) run on Depup's own first-party hosting. `deploy_project` calls the Vercel, Cloudflare, Railway and GitHub APIs on behalf of the signed-in user with that user's own API tokens (third-party APIs the user is authorized to use; Depup does not resell or pool access).
- Personal health data: no. Sponsored content: no.
- Stored: Google profile email/name, user-supplied platform tokens (encrypted AES-256-GCM), deploy history, instant-link files (auto-deleted at expiry). Conversation content is not collected.

## 8. Test & launch (paste into the portal)
```
Reviewer account
- Sign in at https://depup.cloud with this Google account: TODO email / TODO password. (2-step verification is off for this account.)
- The account is pre-populated: Vercel, Cloudflare and Railway tokens and a GitHub token are already saved in Settings, and all three platforms are switched on under Settings > Claude connector.
- Test repo: https://github.com/TODO/depup-reviewer-sample (static page, no build).

Connect
1. In Claude: Settings > Connectors > Add custom connector, URL https://depup.cloud/api/mcp (or use the directory listing once available).
2. Click Connect, sign in with the reviewer Google account, press "Izinkan" (Allow).

Test each tool
1. connector_status: "Which Depup deploy platforms are ready?" -> all three show ready.
2. deploy_website: "Make a one-page site that says Hello and publish it to Depup for 1 hour." -> returns a public link.
3. list_websites: "List my Depup websites." -> shows the link above.
4. deploy_website with replace_site_id: "Change the heading to Hello again and replace that site." -> new link, old one removed.
5. delete_website: "Delete that Depup website." -> removed.
6. deploy_project (Vercel): "Deploy https://github.com/TODO/depup-reviewer-sample to Vercel as depup-review-vercel." -> returns URL and dashboard link.
7. deploy_project (Cloudflare Pages): same repo, platform Cloudflare, name depup-review-cf.
8. deploy_project (Railway): same repo, name depup-review-rw. The static repo needs a small file; Depup lists it and asks for approval. Reply yes -> Claude retries with allow_repo_changes=true.
9. Error paths: switch Railway off in Settings > Claude connector, then ask for a Railway deploy -> clear message telling the user to enable it.

Docs: https://depup.cloud/docs/mcp   Privacy: https://depup.cloud/privacy   Support: TODO
Please do not remove the saved tokens. They belong to throwaway accounts.
```

## 9. Compliance (all seven are required)
- Directory guidelines: confirmed.
- First-party API usage: Instant Links are first-party; platform deploys use the user's own tokens (see section 7).
- Financial transactions: the connector does not move money or crypto.
- AI media generation: the connector does not generate images, video or audio.
- Prompt injection: tool descriptions only describe behavior; no instructions to the model.
- Conversation data collection: none; no access to chat history, memory or files beyond tool arguments.
- Public documentation: https://depup.cloud/docs/mcp

## Reviewer test account: how to set it up (do this once)
1. Create a dedicated Google account (e.g. depup.reviewer@gmail.com). Turn off 2-step verification or reviewers cannot sign in. Use a unique password.
2. Create free throwaway accounts on Vercel, Cloudflare (with the Pages GitHub app connected) and Railway, plus a GitHub account/PAT with `repo` scope limited to the sample repo.
3. Push `reviewer-sample-repo/` to a public repo named `depup-reviewer-sample`.
4. Sign in to Depup with the reviewer account > Settings: paste the four tokens, press Save, then switch on all three platforms under "Claude connector".
5. Run the Test & launch script yourself once. Then delete the projects it created so the free-tier limits are clear for reviewers.
6. After review finishes: revoke the tokens at each provider and disable the Google account.

## After you submit
- By default Anthropic scans the submission and lists it as a **Community** connector; some submissions also get a human review. Track status in https://claude.ai/directory/manage.
- Escalations: `mcp-review@anthropic.com`.
- Keep the server up and the reviewer account intact until review finishes.

## Known review risks
- **Third-party APIs:** the directory expects first-party APIs or ones you may legitimately proxy. Lead with Instant Links in the description (done). If reviewers object, a fallback is to submit with only the three Instant Link tools and keep `deploy_project` as a custom-connector feature.
- **Quota:** Instant Links are capped per account (default 3 active); delete between tests.
- **Cold starts / Vercel limits:** a deploy can take minutes; the tool returns right after the deployment starts.
