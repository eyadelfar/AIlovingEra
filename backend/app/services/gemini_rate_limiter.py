import asyncio

import structlog

logger = structlog.get_logger()


def is_rate_limit_error(exc: Exception) -> bool:
    """Check if an exception is a Gemini API rate limit error."""
    return (
        "ResourceExhausted" in type(exc).__name__
        or "429" in str(exc)
        or "RESOURCE_EXHAUSTED" in str(exc)
    )


async def with_rate_limit_retry(coro_factory, max_retries=3, delay=4):
    """Execute an async function with automatic rate limit retry.

    coro_factory: a callable that returns a new coroutine each time.
    Returns the result of the coroutine on success.
    Raises ValueError with a user-friendly message on exhaustion.
    """
    last_exc = None
    for attempt in range(1 + max_retries):
        try:
            return await coro_factory()
        except Exception as exc:
            last_exc = exc
            if not is_rate_limit_error(exc):
                raise
            if attempt < max_retries:
                logger.warning(
                    "gemini_rate_limited",
                    attempt=attempt + 1,
                    max_attempts=1 + max_retries,
                    retry_delay_s=delay,
                )
                await asyncio.sleep(delay)
            else:
                logger.error("gemini_rate_limit_exhausted", exc_info=True)
                raise ValueError(
                    "AI rate limit reached. Please wait a moment and try again."
                ) from exc

    # Should never reach here, but satisfy type checkers
    raise ValueError("AI rate limit reached. Please wait a moment and try again.") from last_exc
