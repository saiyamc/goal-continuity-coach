import { describe, expect, it } from "vitest";

describe("Gnani voice credentials", () => {
  it("authenticates against the Timbre v2.5 TTS endpoint", async () => {
    const apiKey = process.env.GNANI_API_KEY;
    expect(apiKey, "GNANI_API_KEY must be configured for this integration test").toBeTruthy();

    const response = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-API-Key-ID": apiKey!,
      },
      body: JSON.stringify({
        text: "Hello from Goal Continuity.",
        voice: "Kaveri",
        model: "timbre-v2.5",
        language: "en-IN",
        speed: 1.0,
        audio_config: {
          sample_rate: 16000,
          num_channels: 1,
          sample_width: 2,
          encoding: "linear_pcm",
          container: "wav",
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type") ?? "").toMatch(/audio|wav|octet-stream/i);
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
  }, 30000);
});
