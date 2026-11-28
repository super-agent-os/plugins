# Super Agent OS for Hermes Agent

Connect Artifacts and Mail with one browser approval and separate product keys. Publish pages and read submissions; read and send screened mail. Graph is early access and is not offered by this package. Requires Hermes 0.23.0 or later.

## Install and connect

```
hermes plugins install super-agent-os/plugins/hermes --enable
```

Open the **Super Agent OS** tab in `hermes dashboard` and press **Connect**. Choose Artifacts, Mail, or both. Open the link on any device, compare the code, choose your workspace and Mail access, then approve. Each product receives its own key; a failure for one keeps the other connected. Connecting publishes nothing. **Dashboard ready** checks the dashboard process; it does not prove an existing chat has loaded the tools. The page asks the running profile gateway to reload, preserving Hermes’s confirmation step. If tools are missing, run `/reload-mcp` in your chat and approve the reload; no gateway restart is needed. Open a dashboard for the profile you want to connect; Hermes 0.23.0 refuses this user plugin’s backend from another profile’s dashboard.

In the Hermes desktop app or web app, turn on Super Agent OS in **Capabilities → Plugins** (Hermes keeps a plugin's own settings page off until you do), then open **Settings → Plugins → Super Agent OS** and press **Connect**. It runs the same approval as the dashboard tab. To paste a key instead, use **Agent settings** on that page with a key from [API keys](https://superartifacts.app/api-keys); that form is also the only page Hermes shows before you turn the plugin on.

The package supplies the bearer header; the key is saved in the current profile's `.env` as `SUPER_ARTIFACTS_KEY` for Artifacts and `SUPER_AGENT_MAIL_KEY` for Mail. Keep that file private. **Disconnect** removes the local key and requests a gateway reload. An existing gateway may retain a loaded credential, so local removal does not revoke it. To revoke it on the service, use [Agents](https://superartifacts.app/agents).

## Ask Hermes

Copy a prompt into your chat:

> Publish a private client intake form and give me the link.

> Show me what visitors submitted to my intake form.

The skill asks for a fresh viewer URL whenever you ask to see an artifact. Where Hermes offers `desktop_preview`, it opens the Browser pane. Otherwise the link opens in your browser, including on a phone. Desktop pane viewing is not yet verified by the automated dashboard harness. Viewer URLs expire after ten minutes; ask Hermes to open it again. Owner actions such as Share may open the system browser.

## Terminal alternative

The previous three-line device-code path remains available. Type each line yourself, separately. If you use a profile, start every line with that profile's command instead of `hermes`:

```
hermes config set mcp_servers.super-artifacts '{"url":"https://superartifacts.app/mcp","auth":"oauth","oauth":{"flow":"device"},"enabled":false}'
hermes mcp login super-artifacts
hermes config set mcp_servers.super-artifacts.enabled true
```

The second line prints `Code: XXXX-XXXX` and an address. Open it on any device, enter the code, press **Allow**, and wait for **Authenticated** before the third line. A native server entry of the same name takes precedence over the package entry. Keep this alternative and the dashboard connection in separate profiles to avoid mixing credentials.

## Privacy and scope

This is a hosted connector. Tool calls go to `https://superartifacts.app/mcp` and `https://superagentmail.app/mcp`; the dashboard backend also calls Super Artifacts' account, artifact and device sign-in endpoints. Published files and visitor submissions are stored on Super Artifacts servers; mail is stored on Super Agent Mail servers. Sign-in goes to superartifacts.app. The production package contacts only superartifacts.app and superagentmail.app; development, preview and staging URLs are listed in products.json and used only when explicitly configured. The creator key stays in Hermes's profile `.env`, never in the page JavaScript. No telemetry is added by the package.

Publish private unless you explicitly ask to share an artifact. No private artifact is embedded in a plugin iframe. The hosted MCP tools and the original portable package predate November 4, 2026. This week's additions are the header template, secret settings schema, dashboard connection page and the skill's Browser-pane instructions.

[Documentation](https://superartifacts.app/docs).

## Webhooks

The Super Agent OS tab uses your existing public HTTPS listener address. Artifacts offers mentions, human comments and read-only publish summaries. Mail says **Not available yet**: its shared endpoint is pending, and its legacy signature is incompatible with Hermes. This package never starts a listener. Enable it in Hermes Webhooks settings yourself. “Hermes accepted the test” confirms HTTP acceptance, never agent completion.

If an old `super-artifacts` plugin or native server entry is installed, remove that entry before connecting Super Agent OS. Keep the profile key. The dashboard reports the collision rather than knowingly mixing credentials. Unconnected product credentials are refused individually by Hermes, while the connected server can load.
