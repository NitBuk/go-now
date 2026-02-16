"""Data quality checks run after normalization, before loading.

Checks:
- Hour count (>= 140 of expected 168)
- Range checks for key metrics
- Null rate per key metric (> 10% triggers degraded)
- Timestamp continuity (gaps > 1 hour)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from provider.base import NormalizedHourlyRow

logger = logging.getLogger(__name__)

EXPECTED_HOURS = 168

# Range checks: (field_name, min_val, max_val)
RANGE_CHECKS: list[tuple[str, float, float]] = [
    ("wave_height_m", 0.0, 10.0),
    ("eu_aqi", 0, 500),
    ("uv_index", 0.0, 15.0),
    ("feelslike_c", -5.0, 55.0),
    ("wind_ms", 0.0, 50.0),
]

# Key metrics for null rate check
KEY_METRICS = ["wave_height_m", "feelslike_c", "wind_ms", "uv_index", "eu_aqi"]

NULL_RATE_THRESHOLD = 0.10  # 10%


@dataclass
class DQResult:
    """Result of data quality checks."""

    flags: list[str] = field(default_factory=list)
    is_degraded: bool = False

    def add_flag(self, flag: str, degraded: bool = False) -> None:
        self.flags.append(flag)
        if degraded:
            self.is_degraded = True
        logger.warning("dq_check_flag", extra={"flag_type": flag, "degraded": degraded})


def run_dq_checks(rows: list[NormalizedHourlyRow]) -> DQResult:
    """Run all V1 data quality checks on normalized rows."""
    result = DQResult()
    total = len(rows)

    # 1. Hour count check
    if total < 100:
        result.add_flag(f"very_low_hour_count:{total}", degraded=True)
    elif total < 140:
        result.add_flag(f"low_hour_count:{total}")

    if total == 0:
        return result

    # 2. Range checks
    for field_name, min_val, max_val in RANGE_CHECKS:
        out_of_range = 0
        for row in rows:
            val = getattr(row, field_name, None)
            if val is not None and (val < min_val or val > max_val):
                out_of_range += 1
        if out_of_range > 0:
            result.add_flag(f"out_of_range:{field_name}:{out_of_range}_rows")

    # 3. Null rate per key metric
    for metric in KEY_METRICS:
        null_count = sum(1 for row in rows if getattr(row, metric, None) is None)
        null_rate = null_count / total
        if null_rate > NULL_RATE_THRESHOLD:
            result.add_flag(
                f"null_rate_high:{metric}:{null_rate:.0%}",
                degraded=True,
            )

    # 4. Timestamp continuity
    if total >= 2:
        sorted_rows = sorted(rows, key=lambda r: r.hour_utc)
        for i in range(1, len(sorted_rows)):
            gap_seconds = (
                sorted_rows[i].hour_utc - sorted_rows[i - 1].hour_utc
            ).total_seconds()
            if gap_seconds > 3600:  # > 1 hour gap
                gap_hours = gap_seconds / 3600
                result.add_flag(
                    f"timestamp_gap:{sorted_rows[i-1].hour_utc.isoformat()}"
                    f"_to_{sorted_rows[i].hour_utc.isoformat()}:{gap_hours:.1f}h"
                )

    return result
