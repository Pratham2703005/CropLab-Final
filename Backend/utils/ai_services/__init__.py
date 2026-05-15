"""AI analysis services.

Each service in this package owns a single, data-grounded prompt and is
responsible for turning structured input data into a short text summary.
Prompts intentionally instruct the model to describe ONLY what the data
shows; they must not invent facts, recommendations, or general advice.
"""

from .news_service import generate_news_summary
from .mandi_service import generate_mandi_summary

__all__ = ["generate_news_summary", "generate_mandi_summary"]
