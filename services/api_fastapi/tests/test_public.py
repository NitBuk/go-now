"""Tests for public API endpoints."""

from fastapi.testclient import TestClient


class TestForecastEndpoint:
    def test_forecast_returns_200_with_valid_area(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/forecast?area_id=tel_aviv_coast")
        assert resp.status_code == 200
        data = resp.json()
        assert data["area_id"] == "tel_aviv_coast"
        assert data["freshness"] == "fresh"
        assert data["forecast_age_minutes"] < 90
        assert "hours" in data

    def test_forecast_missing_area_id(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/forecast")
        assert resp.status_code == 400
        data = resp.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"

    def test_forecast_unknown_area_id(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/forecast?area_id=haifa")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "NOT_FOUND"

    def test_forecast_no_data(self, client_no_forecast: TestClient) -> None:
        resp = client_no_forecast.get("/v1/public/forecast?area_id=tel_aviv_coast")
        assert resp.status_code == 404

    def test_forecast_days_filter(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/forecast?area_id=tel_aviv_coast&days=1")
        assert resp.status_code == 200
        data = resp.json()
        # Should have at most 24 hours
        assert len(data["hours"]) <= 24

    def test_forecast_days_validation(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/forecast?area_id=tel_aviv_coast&days=0")
        assert resp.status_code == 422  # FastAPI validation

        resp = client_with_forecast.get("/v1/public/forecast?area_id=tel_aviv_coast&days=8")
        assert resp.status_code == 422

    def test_forecast_stale_freshness(self, client_with_stale_forecast: TestClient) -> None:
        resp = client_with_stale_forecast.get("/v1/public/forecast?area_id=tel_aviv_coast")
        assert resp.status_code == 200
        data = resp.json()
        assert data["freshness"] == "stale"
        assert data["forecast_age_minutes"] >= 90

    def test_forecast_has_request_id_header(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/forecast?area_id=tel_aviv_coast")
        assert "x-request-id" in resp.headers


class TestHealthEndpoint:
    def test_health_healthy(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert data["scoring_version"] == "score_v1"
        assert data["forecast"]["area_id"] == "tel_aviv_coast"
        assert data["forecast"]["freshness"] == "fresh"

    def test_health_degraded_stale(self, client_with_stale_forecast: TestClient) -> None:
        resp = client_with_stale_forecast.get("/v1/public/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "degraded"

    def test_health_unhealthy_no_data(self, client_no_forecast: TestClient) -> None:
        resp = client_no_forecast.get("/v1/public/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "unhealthy"

    def test_health_has_timestamp(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/health")
        data = resp.json()
        assert "timestamp_utc" in data


class TestScoresEndpoint:
    def test_scores_returns_200_with_valid_area(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/scores?area_id=tel_aviv_coast")
        assert resp.status_code == 200
        data = resp.json()
        assert data["area_id"] == "tel_aviv_coast"
        assert data["scoring_version"] == "score_v1"
        assert "hours" in data

    def test_scores_hours_have_scores_object(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/scores?area_id=tel_aviv_coast")
        data = resp.json()
        if data["hours"]:
            hour = data["hours"][0]
            assert "scores" in hour
            scores = hour["scores"]
            for mode in ["swim_solo", "swim_dog", "run_solo", "run_dog"]:
                assert mode in scores
                assert "score" in scores[mode]
                assert "label" in scores[mode]
                assert "reasons" in scores[mode]
                assert "hard_gated" in scores[mode]
                assert 0 <= scores[mode]["score"] <= 100

    def test_scores_missing_area_id(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/scores")
        assert resp.status_code == 400

    def test_scores_unknown_area_id(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/scores?area_id=haifa")
        assert resp.status_code == 404

    def test_scores_no_data(self, client_no_forecast: TestClient) -> None:
        resp = client_no_forecast.get("/v1/public/scores?area_id=tel_aviv_coast")
        assert resp.status_code == 404

    def test_scores_days_filter(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/scores?area_id=tel_aviv_coast&days=1")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["hours"]) <= 24

    def test_scores_includes_raw_data(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/scores?area_id=tel_aviv_coast")
        data = resp.json()
        if data["hours"]:
            hour = data["hours"][0]
            assert "wave_height_m" in hour
            assert "feelslike_c" in hour
            assert "eu_aqi" in hour

    def test_scores_reason_chip_structure(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/v1/public/scores?area_id=tel_aviv_coast")
        data = resp.json()
        if data["hours"]:
            reasons = data["hours"][0]["scores"]["swim_solo"]["reasons"]
            assert len(reasons) >= 2
            for chip in reasons:
                assert "factor" in chip
                assert "text" in chip
                assert "emoji" in chip
                assert "penalty" in chip


class TestRoot:
    def test_root(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/")
        assert resp.status_code == 200
        assert resp.json()["service"] == "go-now-api"
