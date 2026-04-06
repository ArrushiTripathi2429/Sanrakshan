"""
Basic reliability stress checks for Sanrakshan backend.

Usage:
  python scripts/stress_test.py --base-url http://localhost:8000 --rss-runs 20 --priority-runs 20
"""

import argparse
import asyncio
import statistics
import time
from typing import Any

import httpx


async def run_once(client: httpx.AsyncClient, method: str, path: str, json_body: dict[str, Any] | None = None):
    start = time.perf_counter()
    try:
        response = await client.request(method, path, json=json_body)
        latency_ms = round((time.perf_counter() - start) * 1000, 1)
        return {
            "ok": response.status_code < 400,
            "status": response.status_code,
            "latency_ms": latency_ms,
            "json": response.json() if response.headers.get("content-type", "").startswith("application/json") else {},
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - start) * 1000, 1)
        return {"ok": False, "status": 0, "latency_ms": latency_ms, "error": str(e), "json": {}}


def summarize(name: str, results: list[dict[str, Any]]):
    ok = [r for r in results if r["ok"]]
    fail = [r for r in results if not r["ok"]]
    lats = [r["latency_ms"] for r in results]
    print(f"\n{name}")
    print("-" * len(name))
    print(f"runs: {len(results)}")
    print(f"success: {len(ok)}")
    print(f"failed: {len(fail)}")
    print(f"success_rate: {(len(ok) / len(results) * 100):.1f}%")
    print(f"latency_avg_ms: {statistics.mean(lats):.1f}")
    print(f"latency_p95_ms: {statistics.quantiles(lats, n=20)[18]:.1f}" if len(lats) >= 20 else f"latency_max_ms: {max(lats):.1f}")
    if fail:
        print("sample_fail:", fail[0])


async def run_rss_scan(client: httpx.AsyncClient, runs: int):
    results = []
    empty_count = 0
    for _ in range(runs):
        r = await run_once(client, "POST", "/api/early-warning/scan")
        if r["ok"]:
            alerts = r["json"].get("alerts", [])
            if len(alerts) == 0:
                empty_count += 1
        results.append(r)
    summarize("Early Warning RSS Scan", results)
    print(f"empty_alert_responses: {empty_count}")


async def run_priority(client: httpx.AsyncClient, runs: int):
    sample_payload = {
        "reports": [
            {
                "id": "stress-1",
                "title": "Water logging near school",
                "category": "flood",
                "severity": 4,
                "affected": "60",
                "village": "Lalganj",
                "location": "Lalganj",
            }
        ]
    }
    results = []
    for _ in range(runs):
        results.append(await run_once(client, "POST", "/api/priority", sample_payload))
    summarize("Priority Scoring", results)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--rss-runs", type=int, default=20)
    parser.add_argument("--priority-runs", type=int, default=20)
    args = parser.parse_args()

    async with httpx.AsyncClient(base_url=args.base_url, timeout=30) as client:
        await run_rss_scan(client, args.rss_runs)
        await run_priority(client, args.priority_runs)

    print("\nDone. Use these metrics in PPT: success rate, p95 latency, empty-feed fallback behavior.")


if __name__ == "__main__":
    asyncio.run(main())
