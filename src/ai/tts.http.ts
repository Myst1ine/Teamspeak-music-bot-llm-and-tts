import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Logger } from "../logger.js";

export interface HttpTtsOptions {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  format: "mp3" | "wav";
}

export class HttpTtsProvider {
  private readonly logger: Logger;
  private readonly options: HttpTtsOptions;

  constructor(logger: Logger, options: HttpTtsOptions) {
    this.logger = logger;
    this.options = options;
  }

  isAvailable(): boolean {
    return this.options.enabled && !!this.options.baseUrl && !!this.options.model;
  }

  unavailableHint(): string {
    if (!this.options.enabled) return "TTS is disabled.";
    return "TTS is not configured.";
  }

  async synthesizeToTempFile(text: string, voiceOverride?: string): Promise<string> {
    const base = this.options.baseUrl.replace(/\/+$/, "");
    const endpoint = `${base}/v1/audio/speech`;
    let resp: Response;
    try {
      resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.options.apiKey
            ? { Authorization: `Bearer ${this.options.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: this.options.model,
          voice: voiceOverride ?? this.options.voice,
          input: text,
          response_format: this.options.format,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Cannot reach TTS service at ${endpoint}: ${msg}`);
    }

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`TTS HTTP ${resp.status}: ${body.slice(0, 200)}`);
    }

    const audio = Buffer.from(await resp.arrayBuffer());
    const dir = await mkdtemp(join(tmpdir(), "tsmusicbot-tts-"));
    const ext = this.options.format === "wav" ? "wav" : "mp3";
    const file = join(dir, `speech.${ext}`);
    await writeFile(file, audio);
    this.logger.debug({ bytes: audio.length, file }, "TTS audio generated");
    return file;
  }
}
