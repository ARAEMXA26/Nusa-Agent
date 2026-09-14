"""Browser URL Validation and SSRF Protection."""

import ipaddress
import urllib.parse
from typing import Set


BLOCKED_SCHEMES = {"file", "javascript", "data", "vbscript", "gopher", "about"}
BLOCKED_HOSTNAMES = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}


class BrowserSecurityError(Exception):
    """Raised when a navigation request violates security policies."""
    pass


class BrowserSecurity:
    """Validates URLs to prevent SSRF, local network traversal, and protocol abuse."""

    def __init__(
        self,
        allowed_domains: Set[str] | None = None,
        blocked_domains: Set[str] | None = None,
        allow_private_ips: bool = False,
    ):
        self.allowed_domains = allowed_domains
        self.blocked_domains = blocked_domains
        self.allow_private_ips = allow_private_ips

    def validate_url(self, url: str) -> str:
        if not url:
            raise BrowserSecurityError("URL cannot be empty")

        import re
        scheme_match = re.match(r"^([a-zA-Z][a-zA-Z0-9+.-]*):", url)
        if scheme_match:
            scheme = scheme_match.group(1).lower()
            if scheme in BLOCKED_SCHEMES or scheme not in {"http", "https"}:
                raise BrowserSecurityError(f"Prohibited URL scheme '{scheme}'. Only http and https are allowed.")
        else:
            url = f"https://{url}"

        parsed = urllib.parse.urlparse(url)

        hostname = parsed.hostname
        if not hostname:
            raise BrowserSecurityError("URL must have a valid hostname.")

        hostname_lower = hostname.lower()

        # Check blocked hostnames
        if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith(".local"):
            raise BrowserSecurityError(f"Access to localhost/local network host '{hostname}' is blocked.")

        # Check IP address destinations (prevent AWS metadata, private network scan)
        try:
            ip_obj = ipaddress.ip_address(hostname_lower)
            if not self.allow_private_ips:
                if (
                    ip_obj.is_private
                    or ip_obj.is_loopback
                    or ip_obj.is_link_local
                    or str(ip_obj) == "169.254.169.254"
                ):
                    raise BrowserSecurityError(f"Access to private/metadata IP '{hostname}' is blocked.")
        except ValueError:
            # Hostname is a domain name, not an IP literal
            pass

        # Check domain blocklist if configured
        if self.blocked_domains:
            domain_blocked = any(
                hostname_lower == d.lower() or hostname_lower.endswith(f".{d.lower()}")
                for d in self.blocked_domains
            )
            if domain_blocked:
                raise BrowserSecurityError(
                    f"Access to domain '{hostname}' is blocked by security policy."
                )

        # Check domain allowlist if configured
        if self.allowed_domains:
            domain_matched = any(
                hostname_lower == d.lower() or hostname_lower.endswith(f".{d.lower()}")
                for d in self.allowed_domains
            )
            if not domain_matched:
                raise BrowserSecurityError(
                    f"Domain '{hostname}' is not in the configured domain allowlist."
                )

        return url
