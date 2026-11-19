import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const isProduction = process.argv.includes("--production");
const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const envFile = resolve(appDirectory, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const distDirectory = resolve(appDirectory, "dist");
const port = Number(process.env.PORT || 3000);
const apiUrl = "https://api-sf1-cdn.deploy.com/api/v1/chat/completions";
const maxRequestBytes = 32 * 1024;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let bytesRead = 0;

  for await (const chunk of request) {
    bytesRead += chunk.length;
    if (bytesRead > maxRequestBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function handleChat(request, response) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    response.end();
    return;
  }

  const apiKey = process.env.DEPLOY_API_KEY?.trim();
  if (!apiKey || apiKey === "PASTE_YOUR_API_KEY_HERE") {
    sendJson(response, 503, {
      error: "Set your API key in frontend/.env, then restart the server."
    });
    return;
  }

  try {
    const payload = await readJsonBody(request);
    if (
      !payload ||
      typeof payload !== "object" ||
      !Array.isArray(payload.messages) ||
      payload.messages.length === 0 ||
      payload.messages.some(
        (message) =>
          !message ||
          !["system", "user", "assistant"].includes(message.role) ||
          typeof message.content !== "string"
      )
    ) {
      sendJson(response, 400, { error: "A non-empty messages list is required." });
      return;
    }

    const upstreamResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: "zai-org/glm-5.3-flash",
        temperature: 0,
        top_p: 0.95,
        stream: false,
        max_tokens: 1024,
        messages: payload.messages
      })
    });
    const responseText = await upstreamResponse.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      result = null;
    }

    if (!upstreamResponse.ok) {
      const message =
        result?.error?.message || `AI service returned HTTP ${upstreamResponse.status}.`;
      sendJson(response, upstreamResponse.status, { error: message });
      return;
    }

    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.error("AI service returned an unexpected response shape.");
      sendJson(response, 502, { error: "AI service returned an invalid response." });
      return;
    }

    sendJson(response, 200, { content });
  } catch (error) {
    if (error.statusCode) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }

    console.error("Unable to complete AI service request.", error);
    sendJson(response, 502, { error: "Unable to reach the AI service." });
  }
}

async function serveStatic(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Invalid URL");
    return;
  }

  const filePath = resolve(distDirectory, `.${pathname}`);
  const distRelativePath = relative(distDirectory, filePath);
  if (distRelativePath.startsWith("..") || isAbsolute(distRelativePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let fileToServe = filePath;
  try {
    if ((await stat(fileToServe)).isDirectory()) {
      fileToServe = join(fileToServe, "index.html");
    }
    await stat(fileToServe);
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    if (pathname.startsWith("/assets/")) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    fileToServe = join(distDirectory, "index.html");
  }

  const content = await readFile(fileToServe);
  const isAsset = pathname.startsWith("/assets/");
  response.writeHead(200, {
    "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-cache",
    "Content-Length": content.length,
    "Content-Type": contentTypes[extname(fileToServe)] || "application/octet-stream"
  });
  response.end(request.method === "HEAD" ? undefined : content);
}

let vite;
if (!isProduction) {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    appType: "spa",
    server: { middlewareMode: true }
  });
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/api/chat") {
    void handleChat(request, response);
    return;
  }

  if (vite) {
    vite.middlewares(request, response, () => {
      response.writeHead(404);
      response.end("Not found");
    });
    return;
  }

  void serveStatic(request, response).catch((error) => {
    console.error("Unable to serve the frontend.", error);
    if (!response.headersSent) response.writeHead(500);
    response.end("Internal server error");
  });
});

server.listen(port, () => {
  console.log(`WeatherAI server listening on port ${port}.`);
});
