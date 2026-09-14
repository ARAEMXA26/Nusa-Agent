"""Unit tests for Plugin Cryptographic Signing, Ed25519 verification, and Directory Checksums."""

import tempfile
from pathlib import Path
import pytest
from nusa.plugins.crypto import (
    generate_signing_keypair,
    sign_data,
    verify_signature,
    calculate_file_hash,
    calculate_directory_hash,
)


def test_keypair_generation_and_signing():
    priv_hex, pub_hex = generate_signing_keypair()
    assert len(priv_hex) == 64
    assert len(pub_hex) == 64

    payload = b"Nusa Agent Plugin Integrity Verification Test Payload"
    sig_hex = sign_data(priv_hex, payload)
    assert len(sig_hex) == 128

    # Signature must verify successfully
    assert verify_signature(pub_hex, payload, sig_hex) is True

    # Tampered payload must fail verification
    assert verify_signature(pub_hex, b"Tampered payload", sig_hex) is False

    # Wrong public key must fail verification
    _, other_pub_hex = generate_signing_keypair()
    assert verify_signature(other_pub_hex, payload, sig_hex) is False


def test_directory_deterministic_checksum():
    with tempfile.TemporaryDirectory() as td:
        tpath = Path(td)
        f1 = tpath / "main.py"
        f1.write_text("print('hello world')", encoding="utf-8")

        sub = tpath / "utils"
        sub.mkdir()
        f2 = sub / "helper.py"
        f2.write_text("def helper(): pass", encoding="utf-8")

        hash1 = calculate_directory_hash(tpath)
        assert len(hash1) == 64

        # Hashing again without modifications must yield identical hash
        hash2 = calculate_directory_hash(tpath)
        assert hash1 == hash2

        # Modifying a file must change the hash
        f2.write_text("def helper(): return 42", encoding="utf-8")
        hash3 = calculate_directory_hash(tpath)
        assert hash1 != hash3
