"""Cryptographic signing, SHA-256 integrity hashing, and Ed25519 verification for Nusa plugins."""

import hashlib
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519


# Nusa Official Marketplace Public Key (Hardened embedded root key for trusted official plugins)
OFFICIAL_NUSA_PUBLIC_KEY_HEX = "4a15b3eb2581699f8d16eb732a32c4538e158d839212ad823a3be18c9462ce46"


def generate_signing_keypair() -> Tuple[str, str]:
    """Generate a new Ed25519 keypair. Returns (private_key_hex, public_key_hex)."""
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    priv_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return priv_bytes.hex(), pub_bytes.hex()


def sign_data(private_key_hex: str, data: bytes) -> str:
    """Sign arbitrary data with an Ed25519 private key. Returns hex-encoded signature."""
    priv_bytes = bytes.fromhex(private_key_hex)
    private_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)
    signature = private_key.sign(data)
    return signature.hex()


def verify_signature(public_key_hex: str, data: bytes, signature_hex: str) -> bool:
    """Verify an Ed25519 signature against data and public key."""
    try:
        pub_bytes = bytes.fromhex(public_key_hex)
        sig_bytes = bytes.fromhex(signature_hex)
        public_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        public_key.verify(sig_bytes, data)
        return True
    except (InvalidSignature, ValueError, Exception):
        return False


def calculate_file_hash(file_path: Path) -> str:
    """Calculate SHA-256 hash of a single file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def calculate_directory_hash(directory_path: Path, exclude_patterns: Optional[List[str]] = None) -> str:
    """Deterministically compute SHA-256 hash of all files in a directory."""
    excludes = set(exclude_patterns or ["plugin.json", ".git", "__pycache__", ".DS_Store"])
    hasher = hashlib.sha256()

    all_files = []
    for root, _, files in os.walk(directory_path):
        for fname in files:
            if fname in excludes or any(fname.endswith(ext) for ext in [".pyc", ".tmp"]):
                continue
            fpath = Path(root) / fname
            rel_path = fpath.relative_to(directory_path).as_posix()
            all_files.append((rel_path, fpath))

    # Sort files to ensure deterministic hashing across operating systems
    all_files.sort(key=lambda x: x[0])

    for rel_path, fpath in all_files:
        hasher.update(rel_path.encode("utf-8"))
        with open(fpath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)

    return hasher.hexdigest()
