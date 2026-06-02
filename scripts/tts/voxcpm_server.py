"""
Minimal VoxCPM HTTP server (OpenAI-compatible TTS endpoint).

Endpoint:
  POST /v1/audio/speech

Request JSON (subset):
  {
    "model": "openbmb/VoxCPM2",
    "input": "你好，欢迎使用 HAJIMI",
    "voice": "default",
    "response_format": "wav"
  }

Run:
  python scripts/tts/voxcpm_server.py --host 127.0.0.1 --port 8000 --model openbmb/VoxCPM2
"""

from __future__ import annotations

import argparse
import io
import random
from typing import Optional

import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import uvicorn
from voxcpm import VoxCPM


class SpeechRequest(BaseModel):
    model: Optional[str] = None
    input: str
    voice: Optional[str] = "default"
    response_format: Optional[str] = "wav"
    seed: Optional[int] = None


def build_voice_instruction(voice: str) -> str:
    voice_map = {
        "default": "",
        "cute": "(年轻女性，甜美可爱)",
        "cute_lazy_jp": "(日本語で、かわいいけど少しけだるい女の子の話し方。語尾は柔らかく、テンションは低め。)",
        "warm": "(温柔女性，亲切自然)",
        "bright": "(活泼女性，清晰明快)",
        "calm": "(沉稳女性，语速适中)",
    }
    return voice_map.get(voice or "default", "")


def create_app(model_id: str, timesteps: int, cfg_value: float, default_seed: int, device: Optional[str]) -> FastAPI:
    app = FastAPI(title="VoxCPM TTS API", version="0.1.0")
    resolved_device = (device or "").strip().lower()
    if not resolved_device or resolved_device == "auto":
        resolved_device = "cuda" if torch.cuda.is_available() else "cpu"
    model = VoxCPM.from_pretrained(model_id, load_denoiser=False, device=resolved_device)

    @app.get("/health")
    def health() -> dict:
        return {"ok": True, "model": model_id, "device": resolved_device}

    @app.post("/v1/audio/speech")
    def speech(req: SpeechRequest) -> Response:
        text = (req.input or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="input is required")

        fmt = (req.response_format or "wav").lower()
        if fmt not in {"wav"}:
            raise HTTPException(status_code=400, detail="Only response_format=wav is supported")

        instruction = build_voice_instruction(req.voice or "default")
        full_text = f"{instruction}{text}" if instruction else text
        seed = default_seed if req.seed is None else int(req.seed)

        try:
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed_all(seed)
            wav = model.generate(
                text=full_text,
                cfg_value=cfg_value,
                inference_timesteps=timesteps,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"TTS generation failed: {exc}") from exc

        # Ensure float32 numpy array
        audio = np.asarray(wav, dtype=np.float32)
        sr = int(model.tts_model.sample_rate)

        buffer = io.BytesIO()
        sf.write(buffer, audio, sr, format="WAV")
        return Response(content=buffer.getvalue(), media_type="audio/wav")

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="Run VoxCPM local TTS API server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--model", default="openbmb/VoxCPM2")
    parser.add_argument("--timesteps", type=int, default=6, help="Lower is faster, quality may drop")
    parser.add_argument("--cfg", type=float, default=1.5, help="Lower is faster/more stable latency")
    parser.add_argument("--seed", type=int, default=20250601, help="Fixed seed for stable voice style")
    parser.add_argument("--device", default="auto", help="auto|cuda|cpu")
    args = parser.parse_args()
    args.model = (args.model or "").strip().strip("\"'")

    app = create_app(args.model, args.timesteps, args.cfg, args.seed, args.device)
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
