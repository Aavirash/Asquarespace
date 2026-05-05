// export-bookmarks.js - Reads fieldtheory JSONL cache, exports bookmarks with media as JSON
// Usage: node export-bookmarks.js [output-path]
const fs = require("fs");
const path = require("path");

const JSONL_PATH = path.join(process.env.HOME, ".ft-bookmarks", "bookmarks.jsonl");
const OUTPUT_PATH = process.argv[2] || path.join(__dirname, "bookmarks-data.json");

if (!fs.existsSync(JSONL_PATH)) {
  console.error("ERROR: No bookmarks cache found at " + JSONL_PATH);
  console.error("Run 'ft sync' first to download your bookmarks.");
  process.exit(1);
}

const lines = fs.readFileSync(JSONL_PATH, "utf8").trim().split("\n");
const bookmarks = [];

for (const line of lines) {
  try {
    const raw = JSON.parse(line);
    const id = raw.tweetId || raw.id;
    if (!id) continue;

    // Extract media with dimensions (photos + video thumbnails)
    const mediaObjects = (raw.mediaObjects || []).filter(
      (m) => (m.type === "photo" || m.type === "video" || m.type === "animated_gif") && m.url
    );

    const images = mediaObjects.map((m) => {
      const entry = {
        url: m.url,
        width: m.width || 1,
        height: m.height || 1,
        type: m.type || "photo",
      };
      // For videos/gifs, pick the highest quality MP4 variant
      if ((m.type === "video" || m.type === "animated_gif") && m.videoVariants) {
        const mp4s = m.videoVariants
          .filter((v) => v.url && v.url.includes(".mp4"))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        if (mp4s.length > 0) {
          entry.videoUrl = mp4s[0].url;
        }
      }
      return entry;
    });

    bookmarks.push({
      id,
      text: raw.text || "",
      url: raw.url || `https://x.com/${raw.authorHandle}/status/${id}`,
      authorHandle: raw.authorHandle || "",
      authorName: raw.authorName || "",
      authorAvatar: raw.authorProfileImageUrl || "",
      postedAt: raw.postedAt || "",
      images,
      mediaCount: (raw.media || []).length,
      likeCount: raw.engagement?.likeCount ?? 0,
      repostCount: raw.engagement?.repostCount ?? 0,
      bookmarkCount: raw.engagement?.bookmarkCount ?? 0,
    });
  } catch (e) {
    // skip malformed lines
  }
}

// Sort by most recent first
bookmarks.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(bookmarks, null, 2));
console.log(`Exported ${bookmarks.length} bookmarks (${bookmarks.filter((b) => b.images.length > 0).length} with images)`);
console.log(`Output: ${OUTPUT_PATH}`);
