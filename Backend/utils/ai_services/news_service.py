"""News content synthesis service.

Reads the actual headlines + descriptions and tells the farmer WHAT IS
HAPPENING in their crop / region according to the news. The output is a
thematic synthesis grounded in the article text - not a metadata report
(no article counts, no source names, no date ranges).
"""

import json
import logging
from typing import Any, Dict, List, Optional

from .nvidia_client import NvidiaClientError, invoke_text_completion

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You synthesize agricultural news for a farmer. "
    "You are given the actual headlines and short descriptions of recent "
    "articles relevant to the farmer's crop and region. "
    "Your job: tell the farmer what is actually happening - the events, "
    "trends, policy changes, weather/pest situations, market shifts, and "
    "supply-chain news that the articles describe.\n\n"
    "Rules:\n"
    "1. Ground every claim in the article text supplied. Do not invent "
    "events, prices, names, or numbers that are not in the data.\n"
    "2. Do NOT report metadata about the dataset (no article counts, "
    "no source names like 'BusinessLine' or 'Times of India', no "
    "publication dates, no 'X articles in last N days').\n"
    "3. Synthesize across articles. Group related items into themes "
    "(e.g. 'monsoon outlook', 'MSP / procurement', 'pest pressure', "
    "'export curbs') and describe each theme in concrete terms.\n"
    "4. Lead with what changed or what is unfolding, not with how many "
    "stories cover it.\n"
    "5. If the articles do not actually discuss the farmer's crop or "
    "region, say so directly.\n"
    "6. No recommendations, no advice, no 'should consider'. Only what "
    "the articles report.\n"
    "7. Output 2-4 short sentences in plain text, no markdown, no "
    "bullet symbols."
)


def _build_payload(
    articles: List[Dict[str, Any]],
    crop: Optional[str],
    state: Optional[str],
) -> Dict[str, Any]:
    """Send the actual article text to the model.

    We deliberately drop sources, ids, image urls, and publication dates so
    the model is not tempted to summarize the metadata. Title + description
    is what carries the news content.
    """
    article_texts: List[Dict[str, str]] = []

    for article in articles:
        if not isinstance(article, dict):
            continue
        title = article.get("title")
        description = article.get("description")
        title_text = title.strip() if isinstance(title, str) else ""
        description_text = (
            description.strip() if isinstance(description, str) else ""
        )
        if not title_text and not description_text:
            continue

        entry: Dict[str, str] = {}
        if title_text:
            entry["title"] = title_text
        if description_text:
            entry["description"] = description_text
        article_texts.append(entry)

    return {
        "context": {
            "crop": crop,
            "state": state,
        },
        "articles": article_texts,
    }


def _fallback_summary(
    payload: Dict[str, Any],
    has_articles: bool,
) -> str:
    """Used when the LLM is unavailable. Stays content-focused.

    We list the headlines so the farmer still sees what stories were
    available, instead of a metadata-style restatement.
    """
    if not has_articles:
        return (
            "No agricultural news articles relevant to this crop and region "
            "were available for this query."
        )

    articles = payload.get("articles") or []
    titles = [a.get("title") for a in articles if isinstance(a, dict) and a.get("title")]
    if not titles:
        return (
            "Recent articles were available but could not be summarized "
            "right now. Open the news list to read the headlines."
        )

    preview = "; ".join(titles[:3])
    return (
        "AI synthesis is temporarily unavailable. Recent headlines include: "
        f"{preview}. Open the news list to read the rest."
    )


def generate_news_summary(
    articles: Optional[List[Dict[str, Any]]],
    crop: Optional[str] = None,
    state: Optional[str] = None,
) -> str:
    """Return a short thematic synthesis of what's happening in the news."""
    safe_articles = articles if isinstance(articles, list) else []
    payload = _build_payload(safe_articles, crop, state)
    has_articles = bool(payload["articles"])

    if not has_articles:
        return _fallback_summary(payload, has_articles=False)

    user_message = (
        "Tell the farmer what is happening based on these articles. "
        "Synthesize across them, group into themes, focus on events and "
        "changes - not on how many articles there are or which outlet "
        "published them.\n\n"
        f"{json.dumps(payload, ensure_ascii=True)}"
    )

    try:
        return invoke_text_completion(
            SYSTEM_PROMPT,
            user_message,
            max_tokens=320,
            temperature=0.2,
        )
    except NvidiaClientError as exc:
        logger.warning(f"[news_service] LLM unavailable, using fallback: {exc}")
        return _fallback_summary(payload, has_articles=True)
