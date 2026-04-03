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
        assert data["scoring_version"] == "score_v2"
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
        assert data["scoring_version"] == "score_v2"
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


class TestSunriseSunsetGate:
    """Issue #18 - swim score must be 0 before sunrise and after sunset."""

    def test_scores_endpoint_uses_sunrise_from_daily(self, client_with_forecast: TestClient) -> None:  # noqa: E501
        """Scores endpoint should pass sunrise/sunset from daily[] to the engine."""
        resp = client_with_forecast.get("/v1/public/scores?area_id=tel_aviv_coast")
        assert resp.status_code == 200
        data = resp.json()
        # Fixture daily[] has sunrise=04:00 UTC, sunset=17:00 UTC per day.
        # Fixture hours start at 2025-06-01 00:00 UTC. Hours at 00, 01, 02, 03
        # are > 30 min before sunrise → swim scores must be 0 and hard_gated.
        pre_dawn_hours = [
            h for h in data["hours"]
            if h["hour_utc"].startswith("2025-06-01T0") and
            int(h["hour_utc"][11:13]) < 3  # 00, 01, 02
        ]
        for h in pre_dawn_hours:
            swim = h["scores"]["swim_solo"]
            assert swim["score"] == 0, f"Expected 0 at {h['hour_utc']}, got {swim['score']}"
            assert swim["hard_gated"], f"Expected hard_gated at {h['hour_utc']}"
            assert swim["reasons"][0]["factor"] == "dark"

    def test_run_score_not_gated_at_night(self, client_with_forecast: TestClient) -> None:
        """Run scores should not be zeroed by the dark gate."""
        resp = client_with_forecast.get("/v1/public/scores?area_id=tel_aviv_coast")
        data = resp.json()
        pre_dawn_hours = [
            h for h in data["hours"]
            if h["hour_utc"].startswith("2025-06-01T0") and
            int(h["hour_utc"][11:13]) < 3
        ]
        for h in pre_dawn_hours:
            run = h["scores"]["run_solo"]
            assert run["score"] > 0, f"Run score should not be 0 at {h['hour_utc']}"
            assert not run["hard_gated"]


class TestRoot:
    def test_root(self, client_with_forecast: TestClient) -> None:
        resp = client_with_forecast.get("/")
        assert resp.status_code == 200
        assert resp.json()["service"] == "go-now-api"
