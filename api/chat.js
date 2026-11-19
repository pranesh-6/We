const apiUrl = "https://api-sf1-cdn.deploy.com/api/v1/chat/completions";
const maxRequestBytes = 32 * 1024;

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).end();
    return;
  }

  const apiKey = process.env.DEPLOY_API_KEY?.trim();
  if (!apiKey || apiKey === "PASTE_YOUR_API_KEY_HERE") {
    response.status(503).json({
      error: "Set DEPLOY_API_KEY in the hosting environment."
    });
    return;
  }

  const messages = request.body?.messages;
  if (
    Buffer.byteLength(JSON.stringify(request.body ?? {})) > maxRequestBytes
  ) {
    response.status(413).json({ error: "Request body is too large." });
    return;
  }
  if (
    !request.body ||
    typeof request.body !== "object" ||
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.some(
      (message) =>
        !message ||
        !["system", "user", "assistant"].includes(message.role) ||
        typeof message.content !== "string"
    )
  ) {
    response.status(400).json({ error: "A non-empty messages list is required." });
    return;
  }

  try {
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
        messages
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
      response.status(upstreamResponse.status).json({ error: message });
      return;
    }

    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.error("AI service returned an unexpected response shape.");
      response.status(502).json({ error: "AI service returned an invalid response." });
      return;
    }

    response.status(200).json({ content });
  } catch (error) {
    console.error("Unable to complete AI service request.", error);
    response.status(502).json({ error: "Unable to reach the AI service." });
  }
};
