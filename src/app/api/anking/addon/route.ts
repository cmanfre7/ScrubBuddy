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
import threading
from typing import Dict, Any, Optional, List
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

def db_query(col, sql: str, params: tuple = ()) -> Optional[List]:
    """Execute SQL query and return first row, handling both old and new Anki versions.

    In Anki 25.02+ (Rust backend), col.db.execute() returns a list directly.
    In older versions, it returns a cursor with fetchone()/fetchall() methods.
    """
    try:
        result = col.db.execute(sql, params) if params else col.db.execute(sql)

        # New Anki (25.02+): result is a list
        if isinstance(result, list):
            return result[0] if result else None

        # Old Anki: result is a cursor
        if hasattr(result, 'fetchone'):
            return result.fetchone()

        return None
    except Exception as e:
        print(f"ScrubBuddy: DB query error: {e}")
        return None

def db_query_all(col, sql: str, params: tuple = ()) -> List:
    """Execute SQL query and return all rows."""
    try:
        result = col.db.execute(sql, params) if params else col.db.execute(sql)

        # New Anki (25.02+): result is a list
        if isinstance(result, list):
            return result

        # Old Anki: result is a cursor
        if hasattr(result, 'fetchall'):
            return result.fetchall()

        return []
    except Exception as e:
        print(f"ScrubBuddy: DB query error: {e}")
        return []

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
        # Get due counts for ALL decks using deck_due_tree()
        # This returns a tree where the root contains totals for everything
        sched = col.sched

        try:
            # deck_due_tree() returns a tree structure with due counts
            # The root node contains the totals for all decks
            tree = sched.deck_due_tree()

            # The tree structure varies by Anki version
            # Modern Anki (2.1.50+): tree is a DeckTreeNode with .new_count, .learn_count, .review_count
            # Older Anki: tree might be a different structure

            if hasattr(tree, 'new_count'):
                # Modern Anki - DeckTreeNode object
                stats["newDue"] = tree.new_count
                stats["learningDue"] = tree.learn_count
                stats["reviewDue"] = tree.review_count
                print(f"ScrubBuddy: deck_due_tree() DeckTreeNode - New: {tree.new_count}, Learn: {tree.learn_count}, Rev: {tree.review_count}")
            elif isinstance(tree, (list, tuple)):
                # Older format - might be (name, did, rev, lrn, new, children)
                # or a list of deck nodes
                if len(tree) >= 5 and isinstance(tree[0], str):
                    # Single root tuple: (name, did, rev, lrn, new, children)
                    stats["reviewDue"] = tree[2] if len(tree) > 2 else 0
                    stats["learningDue"] = tree[3] if len(tree) > 3 else 0
                    stats["newDue"] = tree[4] if len(tree) > 4 else 0
                    print(f"ScrubBuddy: deck_due_tree() tuple format - New: {stats['newDue']}, Learn: {stats['learningDue']}, Rev: {stats['reviewDue']}")
                else:
                    # Sum up all top-level decks
                    total_new = 0
                    total_lrn = 0
                    total_rev = 0
                    for node in tree:
                        if hasattr(node, 'new_count'):
                            total_new += node.new_count
                            total_lrn += node.learn_count
                            total_rev += node.review_count
                        elif isinstance(node, (list, tuple)) and len(node) >= 5:
                            total_rev += node[2]
                            total_lrn += node[3]
                            total_new += node[4]
                    stats["newDue"] = total_new
                    stats["learningDue"] = total_lrn
                    stats["reviewDue"] = total_rev
                    print(f"ScrubBuddy: deck_due_tree() list format - New: {total_new}, Learn: {total_lrn}, Rev: {total_rev}")
            else:
                print(f"ScrubBuddy: Unknown deck_due_tree format: {type(tree)}")
                # Fallback: try to access attributes
                if hasattr(tree, 'children'):
                    # Sum children counts
                    total_new = 0
                    total_lrn = 0
                    total_rev = 0
                    for child in tree.children:
                        if hasattr(child, 'new_count'):
                            total_new += child.new_count
                            total_lrn += child.learn_count
                            total_rev += child.review_count
                    stats["newDue"] = total_new
                    stats["learningDue"] = total_lrn
                    stats["reviewDue"] = total_rev

        except Exception as e:
            print(f"ScrubBuddy: Error getting deck_due_tree(): {e}")
            import traceback
            traceback.print_exc()

        stats["totalDue"] = stats["newDue"] + stats["reviewDue"] + stats["learningDue"]

        # Get total cards and notes
        stats["totalCards"] = col.card_count()
        stats["totalNotes"] = col.note_count()

        # Get card states (suspended, buried, mature, young)
        row = db_query(col, """
            SELECT
                SUM(CASE WHEN queue = -1 THEN 1 ELSE 0 END),
                SUM(CASE WHEN queue IN (-2, -3) THEN 1 ELSE 0 END),
                SUM(CASE WHEN ivl >= 21 THEN 1 ELSE 0 END),
                SUM(CASE WHEN ivl > 0 AND ivl < 21 THEN 1 ELSE 0 END)
            FROM cards
        """)
        if row:
            stats["suspendedCards"] = row[0] or 0
            stats["buriedCards"] = row[1] or 0
            stats["matureCards"] = row[2] or 0
            stats["youngCards"] = row[3] or 0

        # Get today's study stats from revlog
        day_cutoff = col.sched.day_cutoff
        today_start = (day_cutoff - 86400) * 1000

        row = db_query(col, """
            SELECT
                COUNT(CASE WHEN type = 0 THEN 1 END),
                COUNT(CASE WHEN type IN (1, 2, 3) THEN 1 END),
                SUM(CASE WHEN ease = 1 THEN 1 ELSE 0 END),
                SUM(CASE WHEN ease = 2 THEN 1 ELSE 0 END),
                SUM(CASE WHEN ease = 3 THEN 1 ELSE 0 END),
                SUM(CASE WHEN ease = 4 THEN 1 ELSE 0 END),
                SUM(time)
            FROM revlog WHERE id > ?
        """, (today_start,))
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
        row = db_query(col, """
            SELECT COUNT(*), SUM(CASE WHEN ease > 1 THEN 1 ELSE 0 END)
            FROM revlog WHERE id > ? AND type IN (1, 2, 3)
        """, (thirty_days_ago,))
        if row and row[0] and row[0] > 0:
            stats["retentionRate"] = (row[1] or 0) / row[0]

        print(f"ScrubBuddy: Stats collected - Due: {stats['totalDue']}, Total: {stats['totalCards']}, Mature: {stats['matureCards']}")

    except Exception as e:
        print(f"ScrubBuddy: Error getting collection stats: {e}")
        import traceback
        traceback.print_exc()

    return stats

def do_sync_request(stats: Dict, config: Dict) -> bool:
    """Perform the HTTP sync request (runs in background thread)"""
    try:
        url = f"{config['scrubbuddy_url']}/api/anking/sync"
        data = json.dumps(stats).encode('utf-8')

        request = urllib.request.Request(url, data, {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {config['sync_token']}"
        })

        response = urllib.request.urlopen(request, timeout=30)
        result = json.loads(response.read().decode('utf-8'))

        if result.get('success'):
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

def sync_to_scrubbuddy(show_tooltip: bool = True):
    """Send stats to ScrubBuddy (non-blocking)"""
    config = get_config()

    if not config.get("sync_token"):
        print("ScrubBuddy Sync: No token configured")
        return False

    # Collect stats in main thread (needs access to col)
    stats = get_collection_stats()

    # Do the HTTP request in a background thread to avoid freezing
    def background_sync():
        success = do_sync_request(stats, config)
        if success and show_tooltip:
            # Schedule tooltip on main thread
            mw.taskman.run_on_main(lambda: tooltip("ScrubBuddy: Anki stats synced!"))

    thread = threading.Thread(target=background_sync, daemon=True)
    thread.start()
    return True

def on_profile_loaded():
    """Called when Anki profile is loaded"""
    config = get_config()

    if config.get("sync_on_startup") and config.get("sync_token"):
        QTimer.singleShot(3000, lambda: sync_to_scrubbuddy(show_tooltip=True))

    if config.get("sync_interval_minutes", 0) > 0 and config.get("sync_token"):
        interval_ms = config["sync_interval_minutes"] * 60 * 1000
        timer = QTimer(mw)
        timer.timeout.connect(lambda: sync_to_scrubbuddy(show_tooltip=False))
        timer.start(interval_ms)

def manual_sync():
    """Manual sync triggered from menu"""
    config = get_config()

    if not config.get("sync_token"):
        showInfo("Please configure your ScrubBuddy sync token in the add-on config.\\n\\n"
                "Tools > Add-ons > ScrubBuddy Sync > Config")
        return

    sync_to_scrubbuddy(show_tooltip=True)
    showInfo("Sync started! You'll see a notification when complete.")

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
      version: '1.5.0',
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
