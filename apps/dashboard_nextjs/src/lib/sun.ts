import SunCalc from "suncalc";
import { formatHour } from "./score-utils";
import type { DailySunTime } from "./types";

const TEL_AVIV_LAT = 32.0853;
const TEL_AVIV_LON = 34.7818;

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  sunriseLabel: string;
  sunsetLabel: string;
}

export function getSunTimes(date: Date): SunTimes {
  const times = SunCalc.getTimes(date, TEL_AVIV_LAT, TEL_AVIV_LON);
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    sunriseLabel: formatHour(times.sunrise.toISOString()),
    sunsetLabel: formatHour(times.sunset.toISOString()),
  };
}

/**
 * Look up sun times from stored daily data instead of computing via suncalc.
 * Returns null if no matching date entry is found.
 */
export function getSunTimesFromData(
  date: Date,
  daily: DailySunTime[]
): SunTimes | null {
  const dateStr = date.toISOString().slice(0, 10);
  const entry = daily.find((d) => d.date === dateStr);
  if (!entry) return null;
  const sunrise = new Date(entry.sunrise_utc);
  const sunset = new Date(entry.sunset_utc);
  return {
    sunrise,
    sunset,
    sunriseLabel: formatHour(sunrise.toISOString()),
    sunsetLabel: formatHour(sunset.toISOString()),
  };
}

/**
 * Check if an hour falls on a sunrise or sunset boundary.
 * Returns "sunrise" | "sunset" | null.
 * Matches when the sun event falls within the hour's window.
 */
export function getSunEvent(
  hourUtc: string,
  sunTimes: SunTimes
): { type: "sunrise" | "sunset"; label: string } | null {
  const hourStart = new Date(hourUtc).getTime();
  const hourEnd = hourStart + 3600000;

  if (sunTimes.sunrise.getTime() >= hourStart && sunTimes.sunrise.getTime() < hourEnd) {
    return { type: "sunrise", label: sunTimes.sunriseLabel };
  }
  if (sunTimes.sunset.getTime() >= hourStart && sunTimes.sunset.getTime() < hourEnd) {
    return { type: "sunset", label: sunTimes.sunsetLabel };
  }
  return null;
}
