"""Shared test fixtures for API tests."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

import storage.firestore as firestore_module
from main import app


class FakeFirestoreDoc:
    """Fake Firestore document snapshot."""

    def __init__(self, data: dict[str, Any] | None = None) -> None:
        self._data = data
        self.exists = data is not None

    def to_dict(self) -> dict[str, Any] | None:
        return self._data


class FakeFirestoreDocRef:
    """Fake Firestore document reference."""

    def __init__(self, data: dict[str, Any] | None = None) -> None:
        self._data = data

    def get(self) -> FakeFirestoreDoc:
        return FakeFirestoreDoc(self._data)

    def set(self, data: dict, merge: bool = False) -> None:
        self._data = data

    def delete(self) -> None:
        self._data = None


class FakeFirestoreCollection:
    """Fake Firestore collection."""

    def __init__(self, docs: dict[str, dict[str, Any]]) -> None:
        self._docs = docs

    def document(self, doc_id: str) -> FakeFirestoreDocRef:
        return FakeFirestoreDocRef(self._docs.get(doc_id))


class FakeFirestoreClient:
    """Fake Firestore client that returns pre-configured data."""

    def __init__(self, collections: dict[str, dict[str, dict[str, Any]]]) -> None:
        self._collections = collections

    def collection(self, name: str) -> FakeFirestoreCollection:
        return FakeFirestoreCollection(self._collections.get(name, {}))


def make_forecast_doc(
    age_minutes: int = 10,
    ingest_status: str = "success",
    hours_count: int = 168,
) -> dict[str, Any]:
    """Create a sample forecast document."""
    from datetime import timedelta

    updated_at = datetime.now(UTC) - timedelta(minutes=age_minutes)

    hours = []
    base_time = datetime(2025, 6, 1, 0, 0, 0, tzinfo=UTC)
    for i in range(hours_count):
        h = base_time + timedelta(hours=i)
        hours.append(
            {
                "hour_utc": h.isoformat(),
                "wave_height_m": 0.4,
                "wave_period_s": 5.2,
                "air_temp_c": 24.1,
                "feelslike_c": 25.3,
                "wind_ms": 3.5,
                "gust_ms": 5.0,
                "precip_prob_pct": 0,
                "precip_mm": 0.0,
                "uv_index": 3.0,
                "eu_aqi": 42,
                "pm10": 18.5,
                "pm2_5": 8.2,
            }
        )

    return {
        "area_id": "tel_aviv_coast",
        "updated_at_utc": updated_at.isoformat(),
        "provider": "open_meteo",
        "horizon_days": 7,
        "ingest_status": ingest_status,
        "hours": hours,
    }


@pytest.fixture
def client_with_forecast():
    """Test client with a fresh forecast document in Firestore."""
    doc = make_forecast_doc(age_minutes=10)
    fake_client = FakeFirestoreClient(
        {"forecasts": {"tel_aviv_coast": doc}}
    )
    firestore_module.set_client(fake_client)  # type: ignore[arg-type]
    yield TestClient(app)
    firestore_module.set_client(None)  # type: ignore[arg-type]


@pytest.fixture
def client_with_stale_forecast():
    """Test client with a stale (>90min) forecast document."""
    doc = make_forecast_doc(age_minutes=120, ingest_status="degraded")
    fake_client = FakeFirestoreClient(
        {"forecasts": {"tel_aviv_coast": doc}}
    )
    firestore_module.set_client(fake_client)  # type: ignore[arg-type]
    yield TestClient(app)
    firestore_module.set_client(None)  # type: ignore[arg-type]


@pytest.fixture
def client_no_forecast():
    """Test client with no forecast document in Firestore."""
    fake_client = FakeFirestoreClient({"forecasts": {}})
    firestore_module.set_client(fake_client)  # type: ignore[arg-type]
    yield TestClient(app)
    firestore_module.set_client(None)  # type: ignore[arg-type]
