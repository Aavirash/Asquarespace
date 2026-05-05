// push-to-supabase.js - Pushes X bookmarks to Supabase, deduplicating against existing items
// Usage: node push-to-supabase.js [bookmarks-data-path] [supabase-token]
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://seceezshzzkxoqllbosw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9uq_CY2KsPns9dtogTVbyA_5wlvxA3e";
const STATE_TABLE = "user_workspace_state";
const X_COLLECTION_NAME = "X Bookmarks";

const BOOKMARKS_PATH = process.argv[2] || path.join(__dirname, "bookmarks-data.json");
const USER_TOKEN = process.argv[3];

if (!fs.existsSync(BOOKMARKS_PATH)) {
  console.error("ERROR: No bookmarks data found at " + BOOKMARKS_PATH);
  process.exit(1);
}

if (!USER_TOKEN) {
  console.error("ERROR: No Supabase token provided");
  process.exit(1);
}

async function fetchExistingState(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${STATE_TABLE}?select=*&user_id=eq.${encodeURIComponent(userId)}&board_key=eq.default%3A%3Aspace2-global`,
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${USER_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (res.status === 401) {
    throw new Error("Token expired");
  }

  const data = await res.json();
  if (Array.isArray(data) && data.length > 0 && data[0]?.space2_state) {
    return data[0].space2_state;
  }
  return { items: [], collections: [] };
}

async function pushToSupabase(bookmarks, userId) {
  const state = await fetchExistingState(userId);
  let existingItems = state.items || [];
  let existingCollections = state.collections || [];

  // Build set of existing source URLs for dedup
  const existingSrcs = new Set(existingItems.map(i => i.src));

  // Ensure "X Bookmarks" collection exists
  let xCol = existingCollections.find(c => c.name === X_COLLECTION_NAME);
  if (!xCol) {
    xCol = { id: `col-x-${Date.now()}`, name: X_COLLECTION_NAME, itemIds: [] };
    existingCollections.push(xCol);
  }

  // Filter bookmarks with media, cap at 100 on first import
  const withMedia = bookmarks.filter(b => b.images && b.images.length > 0);
  console.log(`Total bookmarks: ${bookmarks.length}`);
  console.log(`With media: ${withMedia.length}`);

  // Determine if this is first import (no X items exist yet)
  const hasExistingX = existingItems.some(i => i.src && i.src.includes("twimg.com") || i.src.includes("x.com"));
  const itemsToImport = hasExistingX ? withMedia : withMedia.slice(0, 100);
  if (!hasExistingX) {
    console.log(`First import — capping at 100 items`);
  }

  const newItems = [];
  const now = Date.now();

  for (const bm of itemsToImport) {
    for (let i = 0; i < bm.images.length; i++) {
      const img = bm.images[i];
      // Use highest quality image URL for dedup
      const imgUrl = img.url + "?format=jpg&name=orig";
      if (existingSrcs.has(imgUrl)) continue;

      const itemId = `ximg-${bm.id}-${i}-${Math.floor(Math.random() * 9999)}`;
      const item = {
        id: itemId,
        src: imgUrl,
        filePath: "",
        cloudPath: "",
        browserBlobKey: "",
        signedUrlExpiresAt: 0,
        mediaType: img.type === "video" ? "video" : img.type === "animated_gif" ? "gif" : "image",
        thumbnailUrl: imgUrl,
        pageUrl: bm.url,
        title: `${bm.authorName} (@${bm.authorHandle})`,
        description: bm.text,
        collectionIds: [xCol.id],
        createdAt: now - (newItems.length * 1000),
        updatedAt: now - (newItems.length * 1000),
        aiMetaState: "done",
        // Store dimensions for canvas mode
        width: img.width,
        height: img.height,
        // Store video URL for video items
        videoUrl: img.videoUrl || "",
      };

      newItems.push(item);
      existingSrcs.add(imgUrl);
      xCol.itemIds.push(itemId);
    }
  }

  if (newItems.length === 0) {
    console.log("No new bookmarks to sync — all already exist in Supabase");
    return { success: true, count: 0 };
  }

  console.log(`Pushing ${newItems.length} new items to Supabase...`);

  const updatedState = {
    items: [...newItems, ...existingItems],
    collections: existingCollections,
    savedAt: now
  };

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${STATE_TABLE}?on_conflict=user_id,board_key`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${USER_TOKEN}`,
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        board_key: "default::space2-global",
        board_id: "space2-global",
        project_key: "",
        canvas_state: {},
        space2_state: updatedState,
        updated_at: new Date().toISOString()
      }),
    }
  );

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Supabase error ${res.status}: ${errText}`);
  }

  console.log(`Successfully synced ${newItems.length} new bookmark items`);
  return { success: true, count: newItems.length };
}

// Main
async function main() {
  try {
    const bookmarks = JSON.parse(fs.readFileSync(BOOKMARKS_PATH, "utf8"));

    // We need user ID — fetch it from the token
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${USER_TOKEN}`,
      },
    });

    if (!userRes.ok) {
      throw new Error("Failed to get user info — token may be expired");
    }

    const user = await userRes.json();
    if (!user.id) {
      throw new Error("No user ID in response");
    }

    const result = await pushToSupabase(bookmarks, user.id);
    console.log(JSON.stringify(result));
    process.exit(0);
  } catch (err) {
    console.error("ERROR: " + err.message);
    process.exit(1);
  }
}

main();
