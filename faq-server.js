const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = process.env.PORT || process.env.FAQ_PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, "faq-public");
const DATA_FILE = path.join(__dirname, "data", "faqs.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

async function readFaqs() {
  return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
}

async function writeFaqs(faqs) {
  await fs.writeFile(DATA_FILE, `${JSON.stringify(faqs, null, 2)}\n`, "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function normalizeFaq(input, id) {
  const keywords = Array.isArray(input.keywords)
    ? input.keywords
    : String(input.keywords || "").split(",").map((keyword) => keyword.trim()).filter(Boolean);

  return {
    id,
    question: String(input.question || "").trim(),
    answer: String(input.answer || "").trim(),
    category: String(input.category || "").trim(),
    keywords
  };
}

function validateFaq(faq) {
  if (!faq.question) return "Vraag is verplicht.";
  if (!faq.answer) return "Antwoord is verplicht.";
  if (!faq.category) return "Categorie is verplicht.";
  return null;
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const idMatch = url.pathname.match(/^\/api\/faqs\/(\d+)$/);

  if (url.pathname === "/api/faqs" && req.method === "GET") {
    sendJson(res, 200, await readFaqs());
    return;
  }

  if (url.pathname === "/api/faqs" && req.method === "POST") {
    const faqs = await readFaqs();
    const nextId = faqs.length ? Math.max(...faqs.map((faq) => faq.id)) + 1 : 1;
    const faq = normalizeFaq(await readRequestBody(req), nextId);
    const error = validateFaq(faq);
    if (error) return sendError(res, 400, error);
    faqs.push(faq);
    await writeFaqs(faqs);
    sendJson(res, 201, faq);
    return;
  }

  if (idMatch && req.method === "PUT") {
    const id = Number(idMatch[1]);
    const faqs = await readFaqs();
    const index = faqs.findIndex((faq) => faq.id === id);
    if (index === -1) return sendError(res, 404, "FAQ niet gevonden.");
    const faq = normalizeFaq(await readRequestBody(req), id);
    const error = validateFaq(faq);
    if (error) return sendError(res, 400, error);
    faqs[index] = faq;
    await writeFaqs(faqs);
    sendJson(res, 200, faq);
    return;
  }

  if (idMatch && req.method === "DELETE") {
    const id = Number(idMatch[1]);
    const faqs = await readFaqs();
    const nextFaqs = faqs.filter((faq) => faq.id !== id);
    if (nextFaqs.length === faqs.length) return sendError(res, 404, "FAQ niet gevonden.");
    await writeFaqs(nextFaqs);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendError(res, 404, "API-route niet gevonden.");
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) return sendError(res, 403, "Geen toegang.");

  try {
    const file = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "text/plain; charset=utf-8" });
    res.end(file);
  } catch {
    sendError(res, 404, "Bestand niet gevonden.");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendError(res, 500, "Er ging iets mis op de server.");
  }
});

server.listen(PORT, () => {
  console.log(`FAQ prototype draait op http://localhost:${PORT}`);
});
