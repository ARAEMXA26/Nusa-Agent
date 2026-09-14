"""Tests for Browser URL Validation and SSRF Protection."""

import pytest
from nusa.browser.security import BrowserSecurity, BrowserSecurityError


def test_allowed_schemes():
    sec = BrowserSecurity()
    assert sec.validate_url("https://example.com") == "https://example.com"
    assert sec.validate_url("http://example.org/path") == "http://example.org/path"

    with pytest.raises(BrowserSecurityError, match="Prohibited URL scheme"):
        sec.validate_url("file:///etc/passwd")

    with pytest.raises(BrowserSecurityError, match="Prohibited URL scheme"):
        sec.validate_url("javascript:alert(1)")

    with pytest.raises(BrowserSecurityError, match="Prohibited URL scheme"):
        sec.validate_url("data:text/html,<b>pwn</b>")


def test_ssrf_blocking_local_ips():
    sec = BrowserSecurity()

    with pytest.raises(BrowserSecurityError, match="blocked"):
        sec.validate_url("http://127.0.0.1:8080/admin")

    with pytest.raises(BrowserSecurityError, match="blocked"):
        sec.validate_url("http://localhost:3000")

    with pytest.raises(BrowserSecurityError, match="blocked"):
        sec.validate_url("http://169.254.169.254/latest/meta-data/")

    with pytest.raises(BrowserSecurityError, match="blocked"):
        sec.validate_url("http://192.168.1.1/")

    with pytest.raises(BrowserSecurityError, match="blocked"):
        sec.validate_url("http://10.0.0.1/internal")


def test_domain_allowlist():
    sec = BrowserSecurity(allowed_domains={"docs.python.org", "github.com"})

    # In allowlist
    assert sec.validate_url("https://github.com/torvalds/linux") == "https://github.com/torvalds/linux"
    assert sec.validate_url("https://docs.python.org/3/library/") == "https://docs.python.org/3/library/"

    # Not in allowlist
    with pytest.raises(BrowserSecurityError, match="allowlist"):
        sec.validate_url("https://example.com/login")


def test_domain_blocklist():
    sec = BrowserSecurity(blocked_domains={"malicious-site.com"})

    with pytest.raises(BrowserSecurityError, match="is blocked"):
        sec.validate_url("https://malicious-site.com/payload")

    assert sec.validate_url("https://safe-site.org") == "https://safe-site.org"
