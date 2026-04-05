import httpx
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

# Raebareli district coordinates
RAEBARELI_LAT = 26.2303
RAEBARELI_LNG = 81.2409

# Open-Meteo is completely free, no API key needed
# It uses ERA5 + ECMWF forecast data — same source as IMD
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


@router.get("/weather/raebareli")
async def get_weather():
    """
    Fetch 7-day weather forecast for Raebareli district.
    Uses Open-Meteo (free, no API key, ECMWF data).
    Returns rainfall forecast + flood risk assessment.
    """
    params = {
        "latitude":  RAEBARELI_LAT,
        "longitude": RAEBARELI_LNG,
        "daily": [
            "precipitation_sum",        # total rainfall mm/day
            "precipitation_probability_max",  # % chance of rain
            "weathercode",              # WMO weather code
            "temperature_2m_max",
            "windspeed_10m_max",
        ],
        "timezone": "Asia/Kolkata",
        "forecast_days": 7,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            data = resp.json()

        daily = data.get("daily", {})
        dates        = daily.get("time", [])
        rainfall     = daily.get("precipitation_sum", [])
        rain_prob    = daily.get("precipitation_probability_max", [])
        weathercodes = daily.get("weathercode", [])

        # Build daily forecast
        forecast = []
        flood_risk = "low"
        for i, date in enumerate(dates):
            rain_mm   = rainfall[i] if i < len(rainfall) else 0
            prob      = rain_prob[i] if i < len(rain_prob) else 0
            wcode     = weathercodes[i] if i < len(weathercodes) else 0

            # Flood risk logic
            day_risk = "low"
            if rain_mm >= 64.5:       # IMD "heavy rain" threshold
                day_risk = "high"
                flood_risk = "high"
            elif rain_mm >= 15.6:     # IMD "moderate rain"
                day_risk = "medium"
                if flood_risk == "low":
                    flood_risk = "medium"

            forecast.append({
                "date":        date,
                "rainfall_mm": round(rain_mm, 1),
                "rain_prob":   prob,
                "risk":        day_risk,
                "description": _weather_description(wcode),
            })

        # Next 24h summary
        next_24h_rain = rainfall[0] if rainfall else 0
        alert = None
        if flood_risk == "high":
            alert = {
                "level":   "high",
                "message": f"Heavy rainfall expected in Raebareli. Flood-prone villages at risk.",
                "action":  "Pre-position volunteers near flood-prone areas.",
            }
        elif flood_risk == "medium":
            alert = {
                "level":   "medium",
                "message": f"Moderate rainfall forecast. Monitor low-lying villages.",
                "action":  "Keep volunteers on standby.",
            }

        return {
            "success":      True,
            "location":     "Raebareli, Uttar Pradesh",
            "flood_risk":   flood_risk,
            "alert":        alert,
            "forecast":     forecast,
            "fetched_at":   datetime.utcnow().isoformat(),
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def _weather_description(code: int) -> str:
    """Convert WMO weather code to human-readable string"""
    if code == 0:   return "Clear sky"
    if code <= 3:   return "Partly cloudy"
    if code <= 49:  return "Foggy"
    if code <= 67:  return "Rain"
    if code <= 77:  return "Snow"
    if code <= 82:  return "Rain showers"
    if code <= 99:  return "Thunderstorm"
    return "Unknown"
