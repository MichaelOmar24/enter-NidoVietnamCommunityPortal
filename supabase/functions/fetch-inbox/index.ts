import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// IMAP config — same mailbox as SMTP (cPanel: mail.supremecluster.com)
const IMAP_HOST = Deno.env.get("IMAP_HOST") || "mail.supremecluster.com";
const IMAP_PORT = Number(Deno.env.get("IMAP_PORT") || "993");
const IMAP_USER = Deno.env.get("SMTP_USER") || "info@nidovietnam.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CRLF = "\r\n";

// ── Minimal IMAP client over TLS (Deno-native, no npm deps) ──
type ImapItem = { type: "line"; text: string } | { type: "literal"; bytes: Uint8Array };

class ImapClient {
  private conn!: Deno.TlsConn;
  private tagCounter = 0;
  private buf = new Uint8Array(0);
  private offset = 0;

  async connect(host: string, port: number) {
    this.conn = await Deno.connectTls({ hostname: host, port });
    await this.readLine(); // server greeting
  }

  private appendBuf(chunk: Uint8Array) {
    const rest = this.buf.subarray(this.offset);
    const next = new Uint8Array(rest.length + chunk.length);
    next.set(rest);
    next.set(chunk, rest.length);
    this.buf = next;
    this.offset = 0;
  }

  private async fill(): Promise<void> {
    const chunk = new Uint8Array(65536);
    const n = await this.conn.read(chunk);
    if (n === null) throw new Error("IMAP connection closed by server");
    this.appendBuf(chunk.subarray(0, n));
  }

  private async readLine(): Promise<string> {
    for (;;) {
      const idx = this.buf.indexOf(0x0a, this.offset);
      if (idx !== -1) {
        const lineBytes = this.buf.subarray(this.offset, idx + 1);
        this.offset = idx + 1;
        let line = new TextDecoder().decode(lineBytes);
        if (line.endsWith(CRLF)) line = line.slice(0, -2);
        return line;
      }
      await this.fill();
    }
  }

  private async readBytes(n: number): Promise<Uint8Array> {
    while (this.buf.length - this.offset < n) await this.fill();
    const out = this.buf.slice(this.offset, this.offset + n);
    this.offset += n;
    return out;
  }

  private async send(text: string) {
    await this.conn.write(new TextEncoder().encode(text + CRLF));
  }

  async command(cmd: string): Promise<{ items: ImapItem[]; ok: boolean }> {
    const tag = "A" + String(++this.tagCounter);
    await this.send(tag + " " + cmd);
    const items: ImapItem[] = [];
    for (;;) {
      const line = await this.readLine();
      items.push({ type: "line", text: line });
      const litMatch = line.match(/\{(\d+)\}$/);
      if (litMatch) {
        items.push({ type: "literal", bytes: await this.readBytes(Number(litMatch[1])) });
        continue;
      }
      if (line.startsWith(tag + " ")) {
        return { items, ok: line.toUpperCase().indexOf(" OK") !== -1 };
      }
    }
  }

  async login(user: string, pass: string) {
    const esc = (s: string) => s.split("\\").join("\\\\").split('"').join('\\"');
    const res = await this.command('LOGIN "' + esc(user) + '" "' + esc(pass) + '"');
    if (!res.ok) throw new Error("IMAP login failed — check mailbox credentials");
  }

  async close() {
    try { await this.command("LOGOUT"); } catch { /* ignore */ }
    try { this.conn.close(); } catch { /* ignore */ }
  }
}

// ── Header / MIME helpers ──
function decodeRFC2047(input: string): string {
  return input.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_m, charset: string, enc: string, text: string) => {
    try {
      let bytes: Uint8Array;
      if (enc.toUpperCase() === "B") {
        bytes = Uint8Array.from(atob(text.replace(/\s/g, "")), (c) => c.charCodeAt(0));
      } else {
        const qp = text.split("_").join(" ").replace(/=([0-9A-Fa-f]{2})/g, (_x, h: string) => String.fromCharCode(parseInt(h, 16)));
        bytes = Uint8Array.from(qp, (c) => c.charCodeAt(0));
      }
      return new TextDecoder(charset.toLowerCase()).decode(bytes);
    } catch {
      return text;
    }
  });
}

function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const unfolded = raw.replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase();
      if (!headers[key]) headers[key] = decodeRFC2047(line.slice(idx + 1).trim());
    }
  }
  return headers;
}

function decodeBody(content: string, encoding: string, charset: string): string {
  const enc = (encoding || "").toLowerCase();
  if (enc === "base64") {
    try {
      const bytes = Uint8Array.from(atob(content.replace(/\s/g, "")), (c) => c.charCodeAt(0));
      return new TextDecoder(charset).decode(bytes);
    } catch { return content; }
  }
  if (enc === "quoted-printable") {
    try {
      const qp = content.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_x, h: string) => String.fromCharCode(parseInt(h, 16)));
      const bytes = Uint8Array.from(qp, (c) => c.charCodeAt(0));
      return new TextDecoder(charset).decode(bytes);
    } catch { return content; }
  }
  return content;
}

interface ParsedMessage {
  subject: string;
  fromName: string;
  fromAddress: string;
  date: string | null;
  messageId: string | null;
  text: string;
  html: string | null;
}

function parseMessage(raw: string): ParsedMessage {
  const sep = raw.search(/\r?\n\r?\n/);
  const headerRaw = sep === -1 ? raw : raw.slice(0, sep);
  const bodyRaw = sep === -1 ? "" : raw.slice(sep).replace(/^\r?\n\r?\n/, "");
  const headers = parseHeaders(headerRaw);

  const fromMatch = (headers["from"] || "").match(/^(?:"?([^"<]*)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?/);
  const contentType = headers["content-type"] || "text/plain";
  const charset = (contentType.match(/charset="?([^";\s]+)"?/i)?.[1] || "utf-8").toLowerCase();

  let text = "";
  let html: string | null = null;

  const boundary = contentType.match(/boundary="?([^";\s]+)"?/i)?.[1];
  if (contentType.toLowerCase().indexOf("multipart/") === 0 && boundary) {
    const parts = bodyRaw.split("--" + boundary);
    for (let part of parts) {
      if (part.indexOf("--") === 0) continue;
      part = part.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
      if (!part.trim()) continue;
      const pSep = part.search(/\r?\n\r?\n/);
      if (pSep === -1) continue;
      const pHeaders = parseHeaders(part.slice(0, pSep));
      const pBody = part.slice(pSep).replace(/^\r?\n\r?\n/, "");
      const pType = (pHeaders["content-type"] || "text/plain").split(";")[0].trim().toLowerCase();
      const pCharset = ((pHeaders["content-type"] || "").match(/charset="?([^";\s]+)"?/i)?.[1] || "utf-8").toLowerCase();
      const pEnc = pHeaders["content-transfer-encoding"] || "";
      if (pType.indexOf("multipart/") === 0) {
        const nestedRaw = Object.entries(pHeaders).map(([k, v]) => k + ": " + v).join(CRLF) + CRLF + CRLF + pBody;
        const nested = parseMessage(nestedRaw);
        if (!text && nested.text) text = nested.text;
        if (!html && nested.html) html = nested.html;
      } else if (pType === "text/plain" && !text) {
        text = decodeBody(pBody, pEnc, pCharset);
      } else if (pType === "text/html" && !html) {
        html = decodeBody(pBody, pEnc, pCharset);
      }
    }
  } else {
    const decoded = decodeBody(bodyRaw, headers["content-transfer-encoding"] || "", charset);
    if (contentType.toLowerCase().indexOf("text/html") !== -1) html = decoded;
    else text = decoded;
  }

  return {
    subject: headers["subject"] || "(no subject)",
    fromName: (fromMatch?.[1] || "").trim(),
    fromAddress: fromMatch?.[2] || "",
    date: headers["date"] || null,
    messageId: (headers["message-id"] || "").split("<").join("").split(">").join("") || null,
    text: text.trim(),
    html,
  };
}

// ── Handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin-only: verify the caller's session and role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin, is_super_admin, is_embassy_staff")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin && !profile?.is_super_admin && !profile?.is_embassy_staff) {
      return new Response(JSON.stringify({ error: "Forbidden: admins only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const password = Deno.env.get("SMTP_PASSWORD");
    if (!password) throw new Error("SMTP_PASSWORD secret is not configured");

    const body = await req.json().catch(() => ({}));
    const uid = body.uid ? Number(body.uid) : null;
    const limit = Math.min(Number(body.limit) || 30, 100);

    const client = new ImapClient();
    await client.connect(IMAP_HOST, IMAP_PORT);
    await client.login(IMAP_USER, password);

    try {
      const sel = await client.command('SELECT "INBOX"');
      let total = 0;
      for (const item of sel.items) {
        if (item.type === "line") {
          const m = item.text.match(/\* (\d+) EXISTS/i);
          if (m) total = Number(m[1]);
        }
      }

      // Single message (full content, peek — does not mark as read)
      if (uid) {
        const res = await client.command("UID FETCH " + uid + " (BODY.PEEK[])");
        let literal: Uint8Array | null = null;
        for (const item of res.items) {
          if (item.type === "literal") literal = item.bytes;
        }
        if (!literal) {
          return new Response(JSON.stringify({ error: "Message not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const parsed = parseMessage(new TextDecoder().decode(literal));
        return new Response(JSON.stringify({ uid, ...parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Message list (headers only)
      const messages: Record<string, unknown>[] = [];
      if (total > 0) {
        const start = Math.max(1, total - limit + 1);
        const res = await client.command(
          "FETCH " + start + ":* (UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)])"
        );

        let currentUid: number | null = null;
        let currentSeen = false;
        for (const item of res.items) {
          if (item.type === "line") {
            const uidMatch = item.text.match(/UID (\d+)/i);
            const flagsMatch = item.text.match(/FLAGS \(([^)]*)\)/i);
            if (uidMatch) {
              currentUid = Number(uidMatch[1]);
              currentSeen = (flagsMatch?.[1] || "").indexOf("\\Seen") !== -1;
            }
          } else if (currentUid !== null) {
            const headers = parseHeaders(new TextDecoder().decode(item.bytes));
            const fromMatch = (headers["from"] || "").match(/^(?:"?([^"<]*)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?/);
            messages.push({
              uid: currentUid,
              seen: currentSeen,
              subject: headers["subject"] || "(no subject)",
              fromName: (fromMatch?.[1] || "").trim(),
              fromAddress: fromMatch?.[2] || "",
              date: headers["date"] || null,
            });
            currentUid = null;
          }
        }
      }

      messages.reverse(); // newest first

      return new Response(JSON.stringify({ total, messages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      await client.close();
    }
  } catch (err) {
    console.error("fetch-inbox error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
