import type { Logger } from "../logger.js";

export type AiAction =
  | { type: "reply"; text: string }
  | { type: "play"; query: string; platform?: "netease" | "qq" | "bilibili" | "youtube" };

export interface AiMusicContext {
  connected: boolean;
  playing: boolean;
  paused: boolean;
  queueSize: number;
  playMode: "seq" | "loop" | "random" | "rloop";
  currentSong?: {
    name: string;
    artist: string;
    album: string;
    platform: "netease" | "qq" | "bilibili" | "youtube";
  } | null;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChoice {
  message?: { content?: string };
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
}

export class AiChatAssistant {
  private readonly logger: Logger;
  private readonly enabled: boolean;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxHistoryTurns: number;
  private readonly history: OpenAIMessage[] = [];

  constructor(
    logger: Logger,
    options?: {
      enabled?: boolean;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      maxHistoryTurns?: number;
    }
  ) {
    this.logger = logger;
    this.enabled = options?.enabled ?? this.readBool("AI_ENABLED", true);
    this.apiKey =
      options?.apiKey?.trim() ??
      process.env.AI_API_KEY?.trim() ??
      process.env.OPENAI_API_KEY?.trim() ??
      "";
    this.baseUrl = (
      options?.baseUrl?.trim() ||
      process.env.AI_BASE_URL?.trim() ||
      process.env.OPENAI_BASE_URL?.trim() ||
      "https://api.openai.com/v1"
    ).replace(/\/+$/, "");
    this.model =
      options?.model?.trim() ||
      process.env.AI_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-4.1-mini";
    this.maxHistoryTurns = Math.max(0, options?.maxHistoryTurns ?? 8);
  }

  isAvailable(): boolean {
    return this.enabled && this.apiKey.length > 0;
  }

  unavailableHint(): string {
    if (!this.enabled) {
      return "AI is disabled. Set AI_ENABLED=true to enable it.";
    }
    return "AI is not configured. Please set OPENAI_API_KEY.";
  }

  async run(input: string, context?: AiMusicContext): Promise<AiAction> {
    const text = input.trim();
    if (!text) {
      return { type: "reply", text: "Usage: !ai <your request>" };
    }

    if (!this.isAvailable()) {
      return { type: "reply", text: this.unavailableHint() };
    }

    const messages: OpenAIMessage[] = [
      {
        role: "system",
        content:
          "You are a general-purpose assistant living inside a TeamSpeak music bot. " +
          "You have a fixed persona: a cute cat maid with a slightly tsundere tone. " +
          "Sound playful, warm, and lively, but do not be rude or offensive. " +
          "Use light cat-maid flavor naturally in wording, not every sentence. " +
          "Return JSON only with one of these shapes: " +
          '{"type":"reply","text":"..."} or {"type":"play","query":"...","platform":"netease|qq|bilibili|youtube"}. ' +
          "You can chat about broad topics (daily life, study, work, games, tech, emotions, etc.). " +
          "Only choose type=play when user explicitly asks to play/search music. " +
          "When type=reply, always write in Simplified Chinese. " +
          "When type=reply, make the response vivid, playful, and interesting while still helpful. " +
          "Avoid being dry or repetitive.",
      },
      ...(context
        ? [
            {
              role: "system" as const,
              content: `Current player context JSON: ${JSON.stringify(context)}`,
            },
          ]
        : []),
      ...this.history,
      { role: "user", content: text },
    ];

    try {
      const raw = await this.callOpenAI(messages);
      const parsed = this.parseAction(raw);
      if (parsed) {
        this.pushHistory({ role: "user", content: text });
        if (parsed.type === "reply") {
          this.pushHistory({ role: "assistant", content: parsed.text });
        } else {
          this.pushHistory({
            role: "assistant",
            content: `Queued play intent: ${parsed.query} (${parsed.platform ?? "netease"})`,
          });
        }
        return parsed;
      }
      return { type: "reply", text: raw.slice(0, 300) || "I couldn't parse AI output." };
    } catch (err) {
      this.logger.warn({ err }, "AI request failed");
      return { type: "reply", text: "AI request failed. Please try again." };
    }
  }

  async toJapaneseSpeechText(chineseText: string): Promise<string> {
    const src = chineseText.trim();
    if (!src || !this.isAvailable()) return src;
    const messages: OpenAIMessage[] = [
      {
        role: "system",
        content:
          "Convert input text into natural spoken Japanese for TTS. " +
          "Style: cute and upbeat girl tone, clear and lively, gentle ending, not exaggerated. " +
          "Keep original meaning. Output plain Japanese text only, no quotes, no markdown.",
      },
      { role: "user", content: src },
    ];
    try {
      const out = await this.callOpenAI(messages);
      const t = out.trim();
      return t || src;
    } catch (err) {
      this.logger.warn({ err }, "AI JP speech transform failed");
      return src;
    }
  }

  private async callOpenAI(messages: OpenAIMessage[]): Promise<string> {
    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.7,
        messages,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`OpenAI HTTP ${resp.status}: ${body.slice(0, 200)}`);
    }

    const data = (await resp.json()) as OpenAIResponse;
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  private parseAction(text: string): AiAction | null {
    const jsonText = this.extractJson(text);
    if (!jsonText) return null;
    try {
      const obj = JSON.parse(jsonText) as Partial<AiAction> & {
        type?: string;
        query?: string;
        text?: string;
        platform?: string;
      };
      if (obj.type === "play" && obj.query && typeof obj.query === "string") {
        const platform = this.normalizePlatform(obj.platform);
        return { type: "play", query: obj.query.trim(), platform };
      }
      if (obj.type === "reply" && obj.text && typeof obj.text === "string") {
        return { type: "reply", text: this.withCatSuffix(obj.text.trim()) };
      }
    } catch {
      return null;
    }
    return null;
  }

  private extractJson(text: string): string | null {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return text.slice(start, end + 1);
  }

  private normalizePlatform(
    platform?: string
  ): "netease" | "qq" | "bilibili" | "youtube" | undefined {
    if (!platform) return undefined;
    const p = platform.toLowerCase();
    if (p === "qq" || p === "netease" || p === "bilibili" || p === "youtube") {
      return p;
    }
    return undefined;
  }

  private readBool(name: string, fallback: boolean): boolean {
    const raw = process.env[name];
    if (!raw) return fallback;
    const v = raw.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes" || v === "on";
  }

  private pushHistory(message: OpenAIMessage): void {
    this.history.push(message);
    const maxMessages = this.maxHistoryTurns * 2;
    if (this.history.length > maxMessages) {
      this.history.splice(0, this.history.length - maxMessages);
    }
  }

  private withCatSuffix(text: string): string {
    const t = text.trim();
    if (!t) return "喵~";
    if (t.endsWith("喵~")) return t;
    return `${t} 喵~`;
  }
}
