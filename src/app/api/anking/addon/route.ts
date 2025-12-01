import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'
import JSZip from 'jszip'

// Generate the __init__.py content for the add-on
function generateAddonCode(scrubbuddyUrl: string): string {
  return `"""
ScrubBuddy Anki Sync Add-on
===========================
Automatically syncs your Anki stats to ScrubBuddy.

This add-on was generated specifically for your account.
Just install it and restart Anki - no configuration needed!
"""

import json
import urllib.request
import urllib.error
from typing import Dict, Any
from aqt import mw, gui_hooks
from aqt.qt import QTimer
from aqt.utils import showInfo, tooltip

# Add-on config
ADDON_NAME = "ScrubBuddy Sync"

def get_config() -> Dict[str, Any]:
    """Get add-on configuration"""
    config = mw.addonManager.getConfig(__name__)
    if config is None:
        return {
            "scrubbuddy_url": "${scrubbuddyUrl}",
            "sync_token": "",
            "sync_on_startup": True,
            "sync_interval_minutes": 30
        }
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
    """Get comprehensive stats from Anki using native collection access"""
    stats = {
        "newDue": 0, "reviewDue": 0, "learningDue": 0, "totalDue": 0,
        "newStudied": 0, "reviewsStudied": 0, "learnedToday": 0, "timeStudiedSecs": 0,
        "againCount": 0, "hardCount": 0, "goodCount": 0, "easyCount": 0,
        "totalCards": 0, "totalNotes": 0, "matureCards": 0, "youngCards": 0,
        "suspendedCards": 0, "buriedCards": 0, "retentionRate": None, "decks": []
    }

    col = mw.col
    if col is None:
        print("ScrubBuddy: Collection not available")
        return stats

    try:
        # Get due counts directly from scheduler - most reliable method
        # This gives us the exact counts shown in Anki's UI
        sched = col.sched

        # Get counts for all decks using the deck due tree
        # deck_due_tree returns nested structure with (name, did, rev, lrn, new, children)
        try:
            # Anki 2.1.50+ uses different method
            if hasattr(sched, 'deck_due_tree'):
                tree = sched.deck_due_tree()
                # Process the tree to get total counts
                def process_node(node):
                    # node structure varies by Anki version
                    if hasattr(node, 'review_count'):
                        # Anki 2.1.50+ DeckTreeNode
                        return node.new_count, node.learn_count, node.review_count
                    elif isinstance(node, (list, tuple)) and len(node) >= 5:
                        # Older format: (name, did, rev, lrn, new, children)
                        return node[4], node[3], node[2]
                    return 0, 0, 0

                def sum_tree(node):
                    new, lrn, rev = process_node(node)
                    children = []
                    if hasattr(node, 'children'):
                        children = node.children
                    elif isinstance(node, (list, tuple)) and len(node) > 5:
                        children = node[5]
                    for child in children:
                        cn, cl, cr = sum_tree(child)
                        new += cn
                        lrn += cl
                        rev += cr
                    return new, lrn, rev

                if hasattr(tree, 'children'):
                    # Single root node
                    stats["newDue"], stats["learningDue"], stats["reviewDue"] = sum_tree(tree)
                elif isinstance(tree, list):
                    # List of top-level decks
                    for deck_node in tree:
                        n, l, r = sum_tree(deck_node)
                        stats["newDue"] += n
                        stats["learningDue"] += l
                        stats["reviewDue"] += r
            else:
                # Fallback: query counts directly from database
                cursor = col.db.execute("""
                    SELECT
                        SUM(CASE WHEN queue = 0 THEN 1 ELSE 0 END) as new_due,
                        SUM(CASE WHEN queue = 1 THEN 1 ELSE 0 END) as learning_due,
                        SUM(CASE WHEN queue = 2 THEN 1 ELSE 0 END) as review_due
                    FROM cards
                    WHERE queue >= 0
                """)
                row = cursor.fetchone()
                if row:
                    stats["newDue"] = row[0] or 0
                    stats["learningDue"] = row[1] or 0
                    stats["reviewDue"] = row[2] or 0
        except Exception as e:
            print(f"ScrubBuddy: Error getting due counts from scheduler: {e}")
            # Fallback: use SQL query for due counts
            try:
                cursor = col.db.execute("""
                    SELECT
                        SUM(CASE WHEN queue = 0 THEN 1 ELSE 0 END) as new_due,
                        SUM(CASE WHEN queue = 1 THEN 1 ELSE 0 END) as learning_due,
                        SUM(CASE WHEN queue = 2 THEN 1 ELSE 0 END) as review_due
                    FROM cards
                    WHERE queue >= 0
                """)
                row = cursor.fetchone()
                if row:
                    stats["newDue"] = row[0] or 0
                    stats["learningDue"] = row[1] or 0
                    stats["reviewDue"] = row[2] or 0
            except Exception as e2:
                print(f"ScrubBuddy: Fallback SQL also failed: {e2}")

        stats["totalDue"] = stats["newDue"] + stats["reviewDue"] + stats["learningDue"]

        # Get total cards and notes
        stats["totalCards"] = col.card_count()
        stats["totalNotes"] = col.note_count()

        # Get card states (suspended, buried, mature, young)
        cursor = col.db.execute("""
            SELECT
                SUM(CASE WHEN queue = -1 THEN 1 ELSE 0 END) as suspended,
                SUM(CASE WHEN queue IN (-2, -3) THEN 1 ELSE 0 END) as buried,
                SUM(CASE WHEN ivl >= 21 THEN 1 ELSE 0 END) as mature,
                SUM(CASE WHEN ivl > 0 AND ivl < 21 THEN 1 ELSE 0 END) as young
            FROM cards
        """)
        row = cursor.fetchone()
        if row:
            stats["suspendedCards"] = row[0] or 0
            stats["buriedCards"] = row[1] or 0
            stats["matureCards"] = row[2] or 0
            stats["youngCards"] = row[3] or 0

        # Get today's study stats from revlog
        day_cutoff = col.sched.day_cutoff
        today_start = (day_cutoff - 86400) * 1000

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
            stats["timeStudiedSecs"] = (row[6] or 0) // 1000

        # Calculate 30-day retention rate
        thirty_days_ago = (day_cutoff - (30 * 86400)) * 1000
        cursor = col.db.execute("""
            SELECT COUNT(*) as total, SUM(CASE WHEN ease > 1 THEN 1 ELSE 0 END) as passed
            FROM revlog WHERE id > ? AND type IN (1, 2, 3)
        """, (thirty_days_ago,))
        row = cursor.fetchone()
        if row and row[0] > 0:
            stats["retentionRate"] = row[1] / row[0]

        # Get per-deck info using AnkiConnect (optional, for detailed breakdown)
        try:
            deck_names = invoke_anki_connect("deckNames")
            deck_stats_result = invoke_anki_connect("getDeckStats", {"decks": deck_names})
            if deck_stats_result:
                # getDeckStats returns {deck_id: stats_dict}
                for deck_id, ds in deck_stats_result.items():
                    deck_info = {
                        "name": ds.get("name", "Unknown"),
                        "id": str(deck_id),
                        "newDue": ds.get("new_count", 0),
                        "reviewDue": ds.get("review_count", 0),
                        "learningDue": ds.get("learn_count", 0),
                        "totalCards": ds.get("total_in_deck", 0),
                    }
                    stats["decks"].append(deck_info)
        except Exception as e:
            print(f"ScrubBuddy: Could not get per-deck stats (AnkiConnect may not be running): {e}")

        print(f"ScrubBuddy: Stats collected - Due: {stats['totalDue']}, Total: {stats['totalCards']}, Mature: {stats['matureCards']}")

    except Exception as e:
        print(f"ScrubBuddy: Error getting collection stats: {e}")
        import traceback
        traceback.print_exc()

    return stats

def sync_to_scrubbuddy():
    """Send stats to ScrubBuddy"""
    config = get_config()

    if not config.get("sync_token"):
        print("ScrubBuddy Sync: No token configured")
        return False

    try:
        stats = get_collection_stats()
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
        QTimer.singleShot(3000, sync_to_scrubbuddy)

    if config.get("sync_interval_minutes", 0) > 0 and config.get("sync_token"):
        interval_ms = config["sync_interval_minutes"] * 60 * 1000
        timer = QTimer(mw)
        timer.timeout.connect(sync_to_scrubbuddy)
        timer.start(interval_ms)

def manual_sync():
    """Manual sync triggered from menu"""
    config = get_config()

    if not config.get("sync_token"):
        showInfo("Please configure your ScrubBuddy sync token in the add-on config.\\n\\n"
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

gui_hooks.profile_did_open.append(on_profile_loaded)
gui_hooks.main_window_did_init.append(setup_menu)
`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Generate a new token
    const rawToken = randomBytes(32).toString('hex')
    const hashedToken = createHash('sha256').update(rawToken).digest('hex')

    // Upsert the token
    await prisma.ankiSyncToken.upsert({
      where: { userId },
      update: {
        token: hashedToken,
        isActive: true,
        lastSyncAt: null,
      },
      create: {
        userId,
        token: hashedToken,
      },
    })

    // Get the base URL - prefer custom domain
    const scrubbuddyUrl = process.env.NEXTAUTH_URL || 'https://scrubbuddy.app'

    // Create the .ankiaddon package (which is a ZIP file)
    const zip = new JSZip()

    // Add __init__.py (the main add-on code)
    zip.file('__init__.py', generateAddonCode(scrubbuddyUrl))

    // Add manifest.json (Anki 2.1.50+ metadata)
    zip.file('manifest.json', JSON.stringify({
      package: 'scrubbuddy_sync',
      name: 'ScrubBuddy Sync',
      version: '1.1.0',
      author: 'ScrubBuddy',
      homepage: scrubbuddyUrl,
    }, null, 2))

    // Add config.json (default config schema)
    zip.file('config.json', JSON.stringify({
      scrubbuddy_url: scrubbuddyUrl,
      sync_token: rawToken,
      sync_on_startup: true,
      sync_interval_minutes: 30,
    }, null, 2))

    // Add config.md (config documentation for Anki)
    zip.file('config.md', `# ScrubBuddy Sync Configuration

This add-on was pre-configured with your personal sync token.

## Settings

- **scrubbuddy_url**: The URL of your ScrubBuddy instance
- **sync_token**: Your personal sync token (already configured)
- **sync_on_startup**: Whether to sync when Anki starts (default: true)
- **sync_interval_minutes**: How often to sync in minutes (default: 30, set to 0 to disable)

## Manual Sync

You can manually sync anytime from: **Tools > Sync to ScrubBuddy**
`)

    // Generate the ZIP file as blob for NextResponse compatibility
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
    })

    // Convert blob to ArrayBuffer for Response
    const arrayBuffer = await zipBlob.arrayBuffer()

    // Return the ZIP file with appropriate headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="ScrubBuddy_Sync.ankiaddon"',
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating addon:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
