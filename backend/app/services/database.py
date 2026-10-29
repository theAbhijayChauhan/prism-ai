"""PRISM AI: SQLite Persistence & Incident Review Store
Stores disaster incidents, triage predictions, and Human-in-the-Loop review status.
"""

import sqlite3
import json
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from ml.data.dataset import CURATED_INCIDENTS, SEVERITY_CLASSES

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "prism_incidents.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                text TEXT NOT NULL,
                image_type TEXT,
                severity_level INTEGER NOT NULL,
                severity_name TEXT NOT NULL,
                calibrated_confidence REAL NOT NULL,
                raw_softmax_confidence REAL NOT NULL,
                status TEXT NOT NULL,
                review_notes TEXT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                region TEXT NOT NULL,
                created_at TEXT NOT NULL,
                needs_review INTEGER NOT NULL,
                entities_json TEXT NOT NULL
            )
        """)

        # Seed with initial curated incidents if empty
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM incidents")
        count = cursor.fetchone()[0]

        if count == 0:
            for item in CURATED_INCIDENTS:
                sev = item["ground_truth_severity"]
                sev_level = sev + 1
                sev_name = SEVERITY_CLASSES[sev]
                needs_rev = 1 if sev >= 2 else 0
                cursor.execute("""
                    INSERT INTO incidents (
                        id, title, text, image_type, severity_level, severity_name,
                        calibrated_confidence, raw_softmax_confidence, status,
                        review_notes, lat, lng, region, created_at, needs_review, entities_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item["id"],
                    item["title"],
                    item["text"],
                    item["image_type"],
                    sev_level,
                    sev_name,
                    87.4 if sev == 3 else 82.5,
                    96.1 if sev == 3 else 91.0,
                    "UNREVIEWED",
                    "",
                    item["lat"],
                    item["lng"],
                    item["region"],
                    datetime.now(timezone.utc).isoformat(),
                    needs_rev,
                    json.dumps(item["entities"])
                ))
            conn.commit()


def list_incidents(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        if status_filter and status_filter != "ALL":
            cursor.execute("SELECT * FROM incidents WHERE status = ? ORDER BY severity_level DESC", (status_filter,))
        else:
            cursor.execute("SELECT * FROM incidents ORDER BY severity_level DESC, created_at DESC")
        
        rows = cursor.fetchall()
        incidents = []
        for r in rows:
            incidents.append({
                "id": r["id"],
                "title": r["title"],
                "text": r["text"],
                "image_type": r["image_type"],
                "severity_level": r["severity_level"],
                "severity_name": r["severity_name"],
                "calibrated_confidence": r["calibrated_confidence"],
                "raw_softmax_confidence": r["raw_softmax_confidence"],
                "status": r["status"],
                "review_notes": r["review_notes"] or "",
                "lat": r["lat"],
                "lng": r["lng"],
                "region": r["region"],
                "created_at": r["created_at"],
                "needs_review": bool(r["needs_review"]),
                "entities": json.loads(r["entities_json"])
            })
        return incidents


def update_incident_review(incident_id: str, status: str, notes: str, override_severity: Optional[int] = None) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
        row = cursor.fetchone()
        if not row:
            return None

        new_sev = override_severity if override_severity is not None else row["severity_level"]
        new_name = SEVERITY_CLASSES[new_sev - 1] if 1 <= new_sev <= 4 else row["severity_name"]

        cursor.execute("""
            UPDATE incidents
            SET status = ?, review_notes = ?, severity_level = ?, severity_name = ?
            WHERE id = ?
        """, (status, notes, new_sev, new_name, incident_id))
        conn.commit()

        cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
        updated = cursor.fetchone()
        return {
            "id": updated["id"],
            "status": updated["status"],
            "review_notes": updated["review_notes"],
            "severity_level": updated["severity_level"],
            "severity_name": updated["severity_name"]
        }


def add_incident(data: Dict[str, Any]) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO incidents (
                id, title, text, image_type, severity_level, severity_name,
                calibrated_confidence, raw_softmax_confidence, status,
                review_notes, lat, lng, region, created_at, needs_review, entities_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["id"],
            data["title"],
            data["text"],
            data.get("image_type", "user_upload"),
            data["severity_level"],
            data["severity_name"],
            data["calibrated_confidence"],
            data["raw_softmax_confidence"],
            data.get("status", "UNREVIEWED"),
            data.get("review_notes", ""),
            data["lat"],
            data["lng"],
            data["region"],
            data.get("created_at", datetime.now(timezone.utc).isoformat()),
            1 if data.get("needs_review", False) else 0,
            json.dumps(data.get("entities", {}))
        ))
        conn.commit()
        return data
