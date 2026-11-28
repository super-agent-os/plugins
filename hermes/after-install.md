# Connect Super Agent OS

Requires Hermes 0.23.0 or later. Open the **Super Agent OS** tab in `hermes dashboard` and press **Connect**. Choose Artifacts and/or Mail. Open the link, compare the code, choose your workspace and Mail access, and approve. Keys are separate; partial success keeps connected products. Graph is early access and not offered yet.

Desktop and web app: turn on Super Agent OS in **Capabilities → Plugins**, then press **Connect** in **Settings → Plugins → Super Agent OS**. To paste a key instead, use **Agent settings** there with a key from https://superartifacts.app/api-keys.

The key is saved in this profile's `.env`. Disconnect removes it locally; revoke it at https://superartifacts.app/agents. Connecting publishes nothing. **Dashboard ready** checks this dashboard, not an existing chat. If tools are missing in chat, run `/reload-mcp` there and approve the reload; do not restart the gateway. Existing chats may retain a credential after Disconnect, so revoke it at the link above.

For the three-line terminal alternative, see [the README](README.md#terminal-alternative).
