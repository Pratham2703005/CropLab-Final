"""Shared NVIDIA chat-completions client used by AI services.

Keeps HTTP/auth concerns in one place so each service file only needs to own
its prompt and parsing. All services should call ``invoke_text_completion``
with a system prompt + user payload string and receive trimmed text back.
"""

import json
import logging
import os
from typing import Optional

import requests

logger = logging.getLogger(__name__)


class NvidiaClientError(RuntimeError):
    """Raised when the NVIDIA API call cannot produce a usable text result."""


def _config():
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise NvidiaClientError("NVIDIA_API_KEY is not configured")
    model = os.getenv("NVIDIA_MODEL", "meta/llama-4-maverick-17b-128e-instruct").strip()
    url = os.getenv(
        "NVIDIA_API_URL",
        "https://integrate.api.nvidia.com/v1/chat/completions",
    ).strip()
    return api_key, model, url


def invoke_text_completion(
    system_prompt: str,
    user_payload: str,
    *,
    max_tokens: int = 350,
    temperature: float = 0.1,
    timeout: int = 25,
) -> str:
    """Call the configured NVIDIA chat model and return the text response.

    Raises NvidiaClientError on any failure. Callers are expected to catch
    this and fall back to a deterministic data summary so the API stays
    responsive when the LLM is unavailable.
    """
    api_key, model, url = _config()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_payload},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_p": 1.0,
        "stream": False,
    }

    try:
        response = requests.post(url, headers=headers, json=body, timeout=timeout)
    except requests.RequestException as exc:
        raise NvidiaClientError(f"NVIDIA request failed: {exc}") from exc

    if not response.ok:
        detail = response.text[:600].replace("\n", " ")
        raise NvidiaClientError(f"NVIDIA HTTP {response.status_code}: {detail}")

    try:
        data = response.json()
    except ValueError as exc:
        raise NvidiaClientError(f"NVIDIA returned non-JSON: {exc}") from exc

    choices = data.get("choices") or []
    if not choices:
        raise NvidiaClientError(
            f"NVIDIA returned no choices. Response: {json.dumps(data)[:300]}"
        )

    text: Optional[str] = choices[0].get("message", {}).get("content")
    if not isinstance(text, str) or not text.strip():
        raise NvidiaClientError("NVIDIA returned empty content")

    logger.info(f"[ai_services] NVIDIA model {model} returned {len(text)} chars")
    return text.strip()
