"""Firestore client for reading forecast and user profile documents."""

from __future__ import annotations

import logging
from typing import Any

from google.cloud import firestore

logger = logging.getLogger(__name__)

_client: firestore.Client | None = None


def get_client() -> firestore.Client:
    global _client
    if _client is None:
        _client = firestore.Client()
    return _client


def set_client(client: firestore.Client) -> None:
    """Override the Firestore client (for testing)."""
    global _client
    _client = client


def get_forecast_doc(area_id: str) -> dict[str, Any] | None:
    """Read the forecasts/{area_id} serving document."""
    client = get_client()
    doc_ref = client.collection("forecasts").document(area_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    return doc.to_dict()


def get_user_profile(user_id: str) -> dict[str, Any] | None:
    """Read the users/{user_id} profile document."""
    client = get_client()
    doc_ref = client.collection("users").document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    return doc.to_dict()


def set_user_profile(user_id: str, data: dict[str, Any]) -> None:
    """Write the users/{user_id} profile document (upsert)."""
    client = get_client()
    doc_ref = client.collection("users").document(user_id)
    doc_ref.set(data, merge=True)


def delete_user_profile(user_id: str) -> bool:
    """Delete the users/{user_id} profile document. Returns True if existed."""
    client = get_client()
    doc_ref = client.collection("users").document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return False
    doc_ref.delete()
    return True
