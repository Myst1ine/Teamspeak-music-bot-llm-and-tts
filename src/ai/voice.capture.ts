import type { Logger } from "../logger.js";
import { AiChatAssistant, type AiAction } from "./chat.assistant.js";

export interface VoiceIntentResult {
  transcript: string;
  action: AiAction;
}

/**
 * Phase 1 scaffold:
 * - transcription is not wired yet (returns null)
 * - AI intent parsing is already reusable through AiChatAssistant
 */
export class VoiceCapturePipeline {
  private readonly logger: Logger;
  private readonly assistant: AiChatAssistant;

  constructor(logger: Logger) {
    this.logger = logger;
    this.assistant = new AiChatAssistant(logger);
  }

  async handleTranscript(text: string): Promise<VoiceIntentResult> {
    const transcript = text.trim();
    const action = await this.assistant.run(transcript);
    return { transcript, action };
  }

  async transcribePcm16kMono(_pcm: Buffer): Promise<string | null> {
    this.logger.debug("Voice transcription is not implemented yet");
    return null;
  }
}
