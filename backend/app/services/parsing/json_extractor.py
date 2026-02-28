"""Pure functions for extracting and repairing JSON from AI responses."""

import json
import logging
import re

logger = logging.getLogger(__name__)


def extract_json(text: str) -> str:
    """Extract a JSON object or array from raw text that may contain markdown fences."""
    # Try markdown fences first
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        extracted = match.group(1)
        logger.debug("extract_json: extracted %d chars from markdown fence", len(extracted))
        return extracted

    # Try balanced brace extraction
    start = -1
    for i, c in enumerate(text):
        if c in "{[":
            start = i
            break
    if start >= 0:
        open_char = text[start]
        close_char = "}" if open_char == "{" else "]"
        depth = 0
        in_string = False
        escape = False
        for i in range(start, len(text)):
            c = text[i]
            if escape:
                escape = False
                continue
            if c == "\\":
                escape = True
                continue
            if c == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if c == open_char:
                depth += 1
            elif c == close_char:
                depth -= 1
                if depth == 0:
                    extracted = text[start:i + 1]
                    logger.debug("extract_json: balanced extraction, %d chars", len(extracted))
                    return extracted

    # Fallback: greedy regex
    match = re.search(r"[\[{][\s\S]*[\]}]", text)
    if match:
        return match.group(0)
    return text


def repair_json(text: str) -> str:
    """Attempt to fix common JSON issues from AI responses."""
    # Remove control characters except \n \r \t
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    # Strip trailing commas before } and ]
    text = re.sub(r",\s*([\]}])", r"\1", text)

    # Try parsing as-is first
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass

    # Truncation repair: AI hit output token limit mid-response
    text = repair_truncated_json(text)
    return text


def repair_truncated_json(text: str) -> str:
    """Fix JSON truncated mid-response by closing open structures."""
    # Strip trailing partial string value (cut mid-"value...)
    # Find last complete value boundary
    stripped = text.rstrip()

    # If we're inside an unterminated string, back up to last complete element
    in_string = False
    escape = False
    last_good = 0
    for i, c in enumerate(stripped):
        if escape:
            escape = False
            continue
        if c == '\\':
            escape = True
            continue
        if c == '"':
            in_string = not in_string
            if not in_string:
                last_good = i  # end of a complete string
            continue
        if not in_string and c in ('}', ']', '0', '1', '2', '3', '4', '5',
                                    '6', '7', '8', '9', 'e', 'l', 'u'):
            # End of a complete value (object, array, number, true/false/null)
            last_good = i

    if in_string:
        # We're inside an unterminated string — truncate to before this string started
        # Find the opening quote by scanning backward
        for j in range(last_good, -1, -1):
            if stripped[j] == '"':
                # Back up past the key too if this was a value
                stripped = stripped[:j].rstrip().rstrip(',').rstrip(':')
                # Now back up past the key string
                stripped = stripped.rstrip()
                if stripped.endswith('"'):
                    # Find the key's opening quote
                    k = stripped.rfind('"', 0, len(stripped) - 1)
                    if k >= 0:
                        stripped = stripped[:k].rstrip().rstrip(',')
                break
    else:
        # Trim any trailing comma or colon
        stripped = stripped.rstrip().rstrip(',').rstrip(':')

    # Count unclosed braces/brackets
    open_braces = 0
    open_brackets = 0
    in_str = False
    esc = False
    for c in stripped:
        if esc:
            esc = False
            continue
        if c == '\\':
            esc = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if c == '{':
            open_braces += 1
        elif c == '}':
            open_braces -= 1
        elif c == '[':
            open_brackets += 1
        elif c == ']':
            open_brackets -= 1

    # Append missing closers
    closers = ']' * max(0, open_brackets) + '}' * max(0, open_braces)

    # We need to close in the right order — track nesting
    if closers:
        # Re-scan to find the nesting order
        stack = []
        in_str = False
        esc = False
        for c in stripped:
            if esc:
                esc = False
                continue
            if c == '\\':
                esc = True
                continue
            if c == '"':
                in_str = not in_str
                continue
            if in_str:
                continue
            if c in ('{', '['):
                stack.append('}' if c == '{' else ']')
            elif c in ('}', ']') and stack:
                stack.pop()

        closers = ''.join(reversed(stack))
        logger.debug("repair_truncated_json: appending %d closers: %s", len(closers), closers)

    result = stripped + closers

    # Final trailing comma cleanup after truncation repair
    result = re.sub(r",\s*([\]}])", r"\1", result)

    return result
