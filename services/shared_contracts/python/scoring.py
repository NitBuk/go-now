from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ReasonChip:
    factor: str  # "waves" | "heat" | "uv" | "aqi" | "wind" | "rain" | "cold"
    text: str
    emoji: str  # "check" | "warning" | "danger" | "info"
    penalty: int


@dataclass
class ModeScore:
    score: int  # 0-100
    label: str  # "Perfect" | "Good" | "Meh" | "Bad" | "Nope"
    reasons: list[ReasonChip] = field(default_factory=list)  # 2-5 chips
    hard_gated: bool = False


@dataclass
class ScoringOutput:
    hour_utc: datetime
    scoring_version: str = "score_v1"
    swim_solo: ModeScore = field(default_factory=ModeScore)
    swim_dog: ModeScore = field(default_factory=ModeScore)
    run_solo: ModeScore = field(default_factory=ModeScore)
    run_dog: ModeScore = field(default_factory=ModeScore)
