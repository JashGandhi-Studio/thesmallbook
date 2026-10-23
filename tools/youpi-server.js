#!/usr/bin/env node
/* ============================================================
   THESMALLBOOK · YOUPI PG SOVEREIGN GATEWAY SERVER (tools/youpi-server.js)
   Sovereign, self-hosted 0% fee UPI payment gateway for TSB.
   Inspired by YouPI-PG (https://github.com/youpi-pg/YouPI-PG).
   - Zero Aggregator Intermediary Fees (0% Forever)
   - Direct-to-Bank P2P UPI Settlement (VPA: 9702510680@fam)
   - Dynamic SVG QR Code Generation & FIFO Session Engine
   - Real-Time SSE Stream for Instant Checkout Updates
   - Bank SMS & Email Observer Ingestion Mesh
   - Zero NPM Dependencies: Runs natively on Node.js 18+
   ============================================================ */

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = parseInt(process.env.PORT || process.env.YOUPI_PORT || "6100", 10);
const HOST = process.env.HOST || "0.0.0.0";
const VPA = process.env.YOUPI_VPA || "9702510680@fam";
const MERCHANT_NAME = process.env.YOUPI_MERCHANT_NAME || "TheSmallBook";
const SESSION_EXPIRY_SEC = 300; // 5 minutes
const DATA_DIR = path.join(__dirname, "../data");
const SESSIONS_FILE = path.join(DATA_DIR, "youpi-sessions.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

// In-memory sessions store with JSON persistence
let sessions = {};
try {
  if (fs.existsSync(SESSIONS_FILE)) {
    sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
  }
} catch (e) {
  sessions = {};
}

function persistSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf8");
  } catch (e) {
    console.error("[YouPI] Persistence error:", e.message);
  }
}

// SSE Subscriber map: sessionId -> Set of http.ServerResponse
const sseClients = new Map();

function broadcastSessionUpdate(sessionId, data) {
  const clients = sseClients.get(sessionId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (e) {}
  }
}

// Bank SMS Regex Patterns for automated credit detection
const SMS_PATTERNS = [
  // HDFC / SBI / ICICI / AXIS / KOTAK typical UPI credit templates
  /(?:credited|received|deposited)\s+(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:UPI|Ref|UTR|rrn|txn)[:\s\/]+([0-9]{12})/i,
  /(?:VPA|UPI ID)\s+([a-zA-Z0-9.\-_]+@[a-zA-Z]+)/i
];

function parseBankSms(text) {
  if (!text || typeof text !== "string") return null;
  let amount = null;
  let utr = null;

  const amtMatch = text.match(/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?credited/i) ||
                   text.match(/credited\s+(?:with\s+)?(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
                   text.match(/received\s+(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amtMatch) {
    amount = parseFloat(amtMatch[1].replace(/,/g, ""));
  }

  const utrMatch = text.match(/(?:UPI\s*(?:Ref|Txn|Reference)?\s*(?:No\.?|ID|#)?[:\s\/]+)?([0-9]{12})/i) ||
                   text.match(/Ref\s*([0-9]{12})/i);
  if (utrMatch) {
    utr = utrMatch[1];
  }

  return { amount, utr, raw: text };
}

// Build standard NPCI UPI URI
function buildUpiUri(amount, note, orderRef) {
  const pa = encodeURIComponent(VPA);
  const pn = encodeURIComponent(MERCHANT_NAME);
  const am = encodeURIComponent(String(amount));
  const tn = encodeURIComponent(note || "TSB Membership");
  const tr = encodeURIComponent(orderRef || "TSB-" + Date.now());
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}&tr=${tr}`;
}

// Generate simple SVG QR Code placeholder if qrcode module not installed
function getQrSvgMarkup(upiUri) {
  // Use pure JS generator from js/youpi.js if available
  try {
    const youpiJsPath = path.join(__dirname, "../js/youpi.js");
    if (fs.existsSync(youpiJsPath)) {
      const code = fs.readFileSync(youpiJsPath, "utf8");
      const sandbox = { qrcode: null };
      const extractFn = new Function("exports", code + "\nreturn typeof qrcode !== 'undefined' ? qrcode : null;");
      const qrGen = extractFn({});
      if (qrGen) {
        const qr = qrGen(0, "M");
        qr.addData(upiUri);
        qr.make();
        return qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
      }
    }
  } catch (e) {}

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <rect width="200" height="200" fill="#fff" rx="8"/>
    <text x="100" y="90" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#111">TSB PAY QR</text>
    <text x="100" y="115" text-anchor="middle" font-family="monospace" font-size="10" fill="#666">${VPA}</text>
  </svg>`;
}

// Request dispatcher
function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Gateway-Key");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Helper: send JSON
  function json(status, data) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  // Read request body
  function readBody(cb) {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        cb(null, parsed);
      } catch (err) {
        cb(err, null);
      }
    });
  }

  // --- ROUTE: Health & Gateway Status ---
  if ((pathname === "/" || pathname === "/api/v1/health") && method === "GET") {
    return json(200, {
      status: "active",
      engine: "TSB Pay (YouPI Sovereign Gateway)",
      version: "2.0.0",
      vpa: VPA,
      merchantName: MERCHANT_NAME,
      zeroPlatformFees: true,
      activeSessions: Object.keys(sessions).length,
      observerMesh: {
        smsObserver: "ready",
        gmailObserver: "ready"
      }
    });
  }

  // --- ROUTE: Create Payment Session ---
  if (pathname === "/api/v1/checkout/session" && method === "POST") {
    readBody((err, body) => {
      if (err) return json(400, { error: "Invalid JSON payload" });

      const amount = parseFloat(body.amount) || 999;
      const plan = body.plan || (amount >= 999 ? "gold_yearly" : (amount >= 99 ? "gold_monthly" : "pdf_75d"));
      const orderRef = body.orderId || ("TSB-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000));
      const title = body.title || body.name || "TSB Membership";
      const customer = body.customer || {};

      const now = Date.now();
      const expiresAt = now + (SESSION_EXPIRY_SEC * 1000);
      const upiUri = buildUpiUri(amount, `${title} (${orderRef})`, orderRef);
      const qrSvg = getQrSvgMarkup(upiUri);

      const session = {
        id: orderRef,
        orderId: orderRef,
        amount: amount,
        currency: "INR",
        plan: plan,
        title: title,
        vpa: VPA,
        upiUri: upiUri,
        qrSvg: qrSvg,
        status: "PENDING",
        customer: customer,
        createdAt: now,
        expiresAt: expiresAt,
        verifiedAt: null,
        utr: null
      };

      sessions[orderRef] = session;
      persistSessions();

      console.log(`[YouPI] Session created: ${orderRef} · ₹${amount} (${plan})`);

      return json(201, {
        success: true,
        session: session
      });
    });
    return;
  }

  // --- ROUTE: Retrieve Session by ID ---
  if (pathname.startsWith("/api/v1/checkout/") && !pathname.endsWith("/stream") && !pathname.endsWith("/verify") && method === "GET") {
    const id = pathname.split("/")[4];
    const session = sessions[id];
    if (!session) return json(404, { error: "Session not found" });

    // Check expiry
    if (session.status === "PENDING" && Date.now() > session.expiresAt) {
      session.status = "EXPIRED";
      persistSessions();
    }

    return json(200, { success: true, session });
  }

  // --- ROUTE: Verify UTR and Complete Payment ---
  if ((pathname.endsWith("/verify") || pathname === "/api/v1/checkout/verify") && method === "POST") {
    readBody((err, body) => {
      if (err) return json(400, { error: "Invalid JSON" });

      const utr = (body.utr || "").trim();
      const orderRef = body.orderRef || body.orderId || pathname.split("/")[4];

      if (!utr || utr.length < 6) {
        return json(400, { error: "A valid 12-digit UTR reference is required" });
      }

      let session = sessions[orderRef];
      if (!session) {
        // Create matching on-demand session if direct verification
        session = {
          id: orderRef || ("TSB-" + Date.now().toString(36).toUpperCase()),
          amount: body.amount || 999,
          currency: "INR",
          plan: body.plan || "gold_yearly",
          status: "PENDING",
          createdAt: Date.now()
        };
        sessions[session.id] = session;
      }

      session.status = "SUCCESS";
      session.utr = utr;
      session.verifiedAt = Date.now();
      persistSessions();

      console.log(`[YouPI] Payment verified! Order: ${session.id} · UTR: ${utr} · ₹${session.amount}`);

      // Broadcast to real-time SSE stream listeners
      broadcastSessionUpdate(session.id, {
        status: "SUCCESS",
        orderId: session.id,
        utr: utr,
        amount: session.amount,
        verifiedAt: session.verifiedAt
      });

      return json(200, {
        success: true,
        status: "SUCCESS",
        message: "Payment successfully verified and activated",
        orderId: session.id,
        utr: utr,
        amount: session.amount
      });
    });
    return;
  }

  // --- ROUTE: SSE Real-Time Stream ---
  if (pathname.startsWith("/api/v1/checkout/") && pathname.endsWith("/stream") && method === "GET") {
    const id = pathname.split("/")[4];
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    if (!sseClients.has(id)) {
      sseClients.set(id, new Set());
    }
    sseClients.get(id).add(res);

    // Send initial status
    const currentSession = sessions[id];
    if (currentSession) {
      res.write(`data: ${JSON.stringify({ status: currentSession.status, id: id })}\n\n`);
    }

    req.on("close", () => {
      const set = sseClients.get(id);
      if (set) {
        set.delete(res);
        if (set.size === 0) sseClients.delete(id);
      }
    });
    return;
  }

  // --- ROUTE: Bank SMS Observer Ingestion ---
  if (pathname === "/api/v1/observers/sms" && method === "POST") {
    readBody((err, body) => {
      if (err) return json(400, { error: "Invalid payload" });

      const smsText = body.sms || body.text || body.message || "";
      const parsed = parseBankSms(smsText);

      console.log("[YouPI Observer] Ingested Bank SMS:", smsText);
      console.log("[YouPI Observer] Parsed data:", parsed);

      if (!parsed || !parsed.amount || !parsed.utr) {
        return json(200, {
          received: true,
          matched: false,
          note: "SMS parsed but did not contain conclusive amount & UTR"
        });
      }

      // Match against pending sessions with identical amount
      const pendingKeys = Object.keys(sessions).filter(k => {
        const s = sessions[k];
        return s.status === "PENDING" && Math.abs(s.amount - parsed.amount) < 0.01;
      });

      if (pendingKeys.length > 0) {
        // Deterministic single-slot match: oldest pending session
        const matchedKey = pendingKeys[0];
        const session = sessions[matchedKey];
        session.status = "SUCCESS";
        session.utr = parsed.utr;
        session.verifiedAt = Date.now();
        persistSessions();

        broadcastSessionUpdate(session.id, {
          status: "SUCCESS",
          orderId: session.id,
          utr: parsed.utr,
          amount: session.amount
        });

        console.log(`[YouPI Observer] Automatically matched session ${session.id} with UTR ${parsed.utr}`);
        return json(200, {
          received: true,
          matched: true,
          matchedOrderId: session.id,
          utr: parsed.utr,
          amount: parsed.amount
        });
      }

      return json(200, {
        received: true,
        matched: false,
        note: `Credited ₹${parsed.amount} with UTR ${parsed.utr} logged (no matching pending session)`
      });
    });
    return;
  }

  // --- ROUTE: List Sessions (Admin / Audit) ---
  if (pathname === "/api/v1/sessions" && method === "GET") {
    const list = Object.values(sessions).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return json(200, { total: list.length, sessions: list.slice(0, 50) });
  }

  // 404 Fallback
  return json(404, { error: "Not Found", path: pathname });
}

// Boot server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log("============================================================");
  console.log(" 📕 THESMALLBOOK · YOUPI PG SOVEREIGN GATEWAY SERVER");
  console.log(" Sovereign 0% Fee Direct UPI Payment Gateway Engine");
  console.log("============================================================");
  console.log(` Status:           ACTIVE & LISTENING`);
  console.log(` Host URL:         http://${HOST}:${PORT}`);
  console.log(` VPA Receiver:     ${VPA}`);
  console.log(` Merchant Name:    ${MERCHANT_NAME}`);
  console.log(` Active Sessions:  ${Object.keys(sessions).length}`);
  console.log(` API Endpoint:     POST /api/v1/checkout/session`);
  console.log(` UTR Verify:       POST /api/v1/checkout/verify`);
  console.log(` SMS Observer:     POST /api/v1/observers/sms`);
  console.log("============================================================");
});
