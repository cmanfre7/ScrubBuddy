"""
ScrubBuddy Anki Sync Add-on
===========================
This add-on syncs your Anki stats to ScrubBuddy automatically.

Installation:
1. Install AnkiConnect add-on first (code: 2055492159)
2. Copy this file to your Anki addons folder:
   - Windows: %APPDATA%/Anki2/addons21/scrubbuddy_sync/__init__.py
   - Mac: ~/Library/Application Support/Anki2/addons21/scrubbuddy_sync/__init__.py
   - Linux: ~/.local/share/Anki2/addons21/scrubbuddy_sync/__init__.py
3. Create meta.json in the same folder with your config (see below)
4. Restart Anki

Configuration (meta.json):
{
    "config": {
        "scrubbuddy_url": "https://scrubbuddy-production.up.railway.app",
        "sync_token": "YOUR_TOKEN_HERE",
        "sync_on_startup": true,
        "sync_interval_minutes": 30
    }
}
"""

import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List
from aqt import mw, gui_hooks
from aqt.qt import QTimer
from aqt.utils import showInfo, tooltip

# Add-on config
ADDON_NAME = "ScrubBuddy Sync"
DEFAULT_CONFIG = {
    "scrubbuddy_url": "https://scrubbuddy-production.up.railway.app",
    "sync_token": "",
    "sync_on_startup": True,
    "sync_interval_minutes": 30
}

def get_config() -> Dict[str, Any]:
    """Get add-on configuration"""
    config = mw.addonManager.getConfig(__name__)
    if config is None:
        config = DEFAULT_CONFIG.copy()
    return config

def invoke_anki_connect(action: str, params: Dict = None) -> Any:
    """Call AnkiConnect API"""
    request_json = json.dumps({
        "action": action,
        "version": 6,
        "params": params or {}
    }).encode('utf-8')

    try:
        request = urllib.request.Request('http://127.0.0.1:8765', request_json)
        response = urllib.request.urlopen(request, timeout=10)
        response_data = json.loads(response.read().decode('utf-8'))

        if response_data.get('error'):
            raise Exception(response_data['error'])

        return response_data.get('result')
    except urllib.error.URLError as e:
        raise Exception(f"AnkiConnect not available: {e}")
    except Exception as e:
        raise Exception(f"AnkiConnect error: {e}")

def get_collection_stats() -> Dict[str, Any]:
    """Get comprehensive stats from Anki"""
    stats = {
        # Cards due
        "newDue": 0,
        "reviewDue": 0,
        "learningDue": 0,
        "totalDue": 0,

        # Today's progress
        "newStudied": 0,
        "reviewsStudied": 0,
        "learnedToday": 0,
        "timeStudiedSecs": 0,

        # Answer buttons
        "againCount": 0,
        "hardCount": 0,
        "goodCount": 0,
        "easyCount": 0,

        # Collection totals
        "totalCards": 0,
        "totalNotes": 0,
        "matureCards": 0,
        "youngCards": 0,
        "suspendedCards": 0,
        "buriedCards": 0,

        # Retention
        "retentionRate": None,

        # Per-deck stats
        "decks": []
    }

    col = mw.col
    if col is None:
        return stats

    # Get deck names and IDs
    try:
        deck_names = invoke_anki_connect("deckNames")
    except:
        deck_names = []

    # Get due counts for each deck
    for deck_name in deck_names:
        try:
            # Get deck tree which includes due counts
            deck_stats = invoke_anki_connect("getDeckStats", {"decks": [deck_name]})
            if deck_stats and deck_name in deck_stats:
                ds = deck_stats[deck_name]
                deck_info = {
                    "name": deck_name,
                    "id": str(ds.get("deck_id", "")),
                    "newDue": ds.get("new_count", 0),
                    "reviewDue": ds.get("review_count", 0),
                    "learningDue": ds.get("learn_count", 0),
                    "totalCards": ds.get("total_in_deck", 0),
                    "totalNew": 0,
                    "totalLearning": 0,
                    "totalReview": 0,
                    "totalSuspended": 0
                }
                stats["decks"].append(deck_info)

                # Aggregate totals (only for top-level decks to avoid double counting)
                if "::" not in deck_name:
                    stats["newDue"] += deck_info["newDue"]
                    stats["reviewDue"] += deck_info["reviewDue"]
                    stats["learningDue"] += deck_info["learningDue"]
        except Exception as e:
            print(f"Error getting stats for deck {deck_name}: {e}")

    stats["totalDue"] = stats["newDue"] + stats["reviewDue"] + stats["learningDue"]

    # Get collection-level stats using direct database queries
    try:
        # Total cards and notes
        stats["totalCards"] = col.card_count()
        stats["totalNotes"] = col.note_count()

        # Card states using SQL
        # Mature = interval >= 21 days, Young = interval < 21 days
        # Card types: 0=new, 1=learning, 2=review, 3=relearning
        # Queue: -1=suspended, -2=user buried, -3=sched buried

        cursor = col.db.execute("""
            SELECT
                SUM(CASE WHEN queue = -1 THEN 1 ELSE 0 END) as suspended,
                SUM(CASE WHEN queue IN (-2, -3) THEN 1 ELSE 0 END) as buried,
                SUM(CASE WHEN type = 2 AND ivl >= 21 THEN 1 ELSE 0 END) as mature,
                SUM(CASE WHEN type = 2 AND ivl < 21 AND ivl > 0 THEN 1 ELSE 0 END) as young
            FROM cards
        """)
        row = cursor.fetchone()
        if row:
            stats["suspendedCards"] = row[0] or 0
            stats["buriedCards"] = row[1] or 0
            stats["matureCards"] = row[2] or 0
            stats["youngCards"] = row[3] or 0

        # Today's stats from revlog
        # Get today's date cutoff (Anki uses days since epoch in local time)
        day_cutoff = col.sched.day_cutoff
        today_start = (day_cutoff - 86400) * 1000  # Convert to milliseconds

        cursor = col.db.execute("""
            SELECT
                COUNT(CASE WHEN type = 0 THEN 1 END) as new_studied,
                COUNT(CASE WHEN type IN (1, 2, 3) THEN 1 END) as reviews,
                SUM(CASE WHEN ease = 1 THEN 1 ELSE 0 END) as again,
                SUM(CASE WHEN ease = 2 THEN 1 ELSE 0 END) as hard,
                SUM(CASE WHEN ease = 3 THEN 1 ELSE 0 END) as good,
                SUM(CASE WHEN ease = 4 THEN 1 ELSE 0 END) as easy,
                SUM(time) as total_time
            FROM revlog
            WHERE id > ?
        """, (today_start,))
        row = cursor.fetchone()
        if row:
            stats["newStudied"] = row[0] or 0
            stats["reviewsStudied"] = row[1] or 0
            stats["againCount"] = row[2] or 0
            stats["hardCount"] = row[3] or 0
            stats["goodCount"] = row[4] or 0
            stats["easyCount"] = row[5] or 0
            stats["timeStudiedSecs"] = (row[6] or 0) // 1000  # Convert ms to seconds

        # Calculate retention rate (last 30 days)
        thirty_days_ago = (day_cutoff - (30 * 86400)) * 1000
        cursor = col.db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN ease > 1 THEN 1 ELSE 0 END) as passed
            FROM revlog
            WHERE id > ? AND type IN (1, 2, 3)
        """, (thirty_days_ago,))
        row = cursor.fetchone()
        if row and row[0] > 0:
            stats["retentionRate"] = row[1] / row[0]

    except Exception as e:
        print(f"Error getting collection stats: {e}")

    return stats

def sync_to_scrubbuddy():
    """Send stats to ScrubBuddy"""
    config = get_config()

    if not config.get("sync_token"):
        print("ScrubBuddy Sync: No token configured")
        return False

    try:
        # Get stats
        stats = get_collection_stats()

        # Send to ScrubBuddy
        url = f"{config['scrubbuddy_url']}/api/anking/sync"
        data = json.dumps(stats).encode('utf-8')

        request = urllib.request.Request(url, data, {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {config['sync_token']}"
        })

        response = urllib.request.urlopen(request, timeout=30)
        result = json.loads(response.read().decode('utf-8'))

        if result.get('success'):
            tooltip("ScrubBuddy: Anki stats synced!")
            print("ScrubBuddy Sync: Success")
            return True
        else:
            print(f"ScrubBuddy Sync failed: {result.get('error', 'Unknown error')}")
            return False

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        print(f"ScrubBuddy Sync HTTP error: {e.code} - {error_body}")
        return False
    except Exception as e:
        print(f"ScrubBuddy Sync error: {e}")
        return False

def on_profile_loaded():
    """Called when Anki profile is loaded"""
    config = get_config()

    if config.get("sync_on_startup") and config.get("sync_token"):
        # Delay sync slightly to let Anki fully initialize
        QTimer.singleShot(3000, sync_to_scrubbuddy)

    # Set up periodic sync
    if config.get("sync_interval_minutes", 0) > 0 and config.get("sync_token"):
        interval_ms = config["sync_interval_minutes"] * 60 * 1000
        timer = QTimer(mw)
        timer.timeout.connect(sync_to_scrubbuddy)
        timer.start(interval_ms)

def manual_sync():
    """Manual sync triggered from menu"""
    config = get_config()

    if not config.get("sync_token"):
        showInfo("Please configure your ScrubBuddy sync token in the add-on config.\n\n"
                "Tools > Add-ons > ScrubBuddy Sync > Config")
        return

    if sync_to_scrubbuddy():
        showInfo("Anki stats synced to ScrubBuddy successfully!")
    else:
        showInfo("Failed to sync to ScrubBuddy. Check the console for details.")

def setup_menu():
    """Add menu item for manual sync"""
    action = mw.form.menuTools.addAction("Sync to ScrubBuddy")
    action.triggered.connect(manual_sync)

# Initialize the add-on
gui_hooks.profile_did_open.append(on_profile_loaded)
gui_hooks.main_window_did_init.append(setup_menu)
