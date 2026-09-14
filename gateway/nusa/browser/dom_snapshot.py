"""DOM-first Snapshot Engine for clean, token-efficient web interaction."""

from typing import Any
from bs4 import BeautifulSoup, Tag


class DOMSnapshotEngine:
    """Extracts interactive accessibility and readable text representation from HTML."""

    @staticmethod
    def process_html(html_content: str, max_chars: int = 15000) -> dict[str, Any]:
        """Convert raw HTML into clean semantic text and interactive elements list."""
        soup = BeautifulSoup(html_content, "html.parser")

        # Strip scripts, styles, SVGs, iframes, meta tags, and base64 images
        for tag in soup(["script", "style", "svg", "noscript", "iframe", "meta", "link"]):
            tag.decompose()

        interactive_elements: list[dict[str, Any]] = []
        elem_counter = 1

        # Extract title
        title = soup.title.string.strip() if soup.title and soup.title.string else "Untitled"

        # Identify interactive elements: button, a, input, select, textarea
        for tag in soup.find_all(["a", "button", "input", "select", "textarea"]):
            if not isinstance(tag, Tag):
                continue

            elem_type = tag.name
            elem_id = f"el-{elem_counter}"
            text = tag.get_text(strip=True)
            tag_attrs = dict(tag.attrs)
            
            # Format attributes
            placeholder = tag_attrs.get("placeholder", "")
            href = tag_attrs.get("href", "")
            value = tag_attrs.get("value", "")
            name = tag_attrs.get("name", "")
            input_type = tag_attrs.get("type", "text")

            item = {
                "id": elem_id,
                "type": elem_type,
                "text": text[:60] if text else "",
            }

            if elem_type == "a" and href:
                item["href"] = str(href)[:100]
            elif elem_type == "input":
                item["input_type"] = str(input_type)
                if placeholder:
                    item["placeholder"] = str(placeholder)
                if name:
                    item["name"] = str(name)
            elif elem_type == "button":
                if name:
                    item["name"] = str(name)

            interactive_elements.append(item)

            # Annotate tag in place for textual snapshot
            label = f" [{elem_id}:{elem_type}"
            if text:
                label += f" '{text[:30]}'"
            elif placeholder:
                label += f" '{placeholder}'"
            label += "] "

            tag.replace_with(label)
            elem_counter += 1

        # Get cleaned text
        text_content = soup.get_text(separator=" ", strip=True)
        # Collapse multiple whitespaces
        import re
        cleaned_text = re.sub(r"\s+", " ", text_content).strip()

        if len(cleaned_text) > max_chars:
            cleaned_text = cleaned_text[:max_chars] + "... [TRUNCATED FOR TOKEN BUDGET]"

        return {
            "title": title,
            "text_preview": cleaned_text,
            "interactive_elements": interactive_elements[:50],  # Limit to 50 key elements
            "total_interactive_count": len(interactive_elements),
        }
