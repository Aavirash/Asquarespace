# Re-collect Product Feature Reference

Use this as a blueprint for rebuilding the same experience in another app.

## Core Product Idea
- Personal visual inspiration library.
- Fast capture, fast organization, fast rediscovery.
- Feels like a visual workspace, not a file manager.

## Content Types
- Link item (a web URL).
- Image item (uploaded image).
- Text item (quick note/thought/reference).

## Capture & Input
- One unified input area for adding links or text quickly.
- Upload button for image import.
- Multi-image import support.
- Drag and drop image support.
- Paste image support.

## Main Browsing Experience
- Visual grid as the primary browsing mode.
- Optional list mode for compact scanning.
- Grid is masonry-style (mixed card heights) so visual browsing feels natural.
- Quick item entry always visible at top.

## Item Card Behavior
- Card can display image preview, link preview state, or text preview.
- Card opens into a focused detail/editor view.
- Card supports delete action.
- Link-type item supports open-link action.

## Focus View (Item Detail)
- Full item editor in a modal/focused view.
- Edit title, description, and content.
- For link items, open source link in new tab.
- Assign/remove item from collections directly.
- Done/close flow that returns to the same browsing context.
- Arrow-key navigation across current visible item set.

## Collections
- Create collections.
- View all collections in sidebar and collections page.
- Open a collection-specific page.
- Rename collection inline.
- Delete collection (without deleting the underlying items).
- Items can belong to multiple collections.

## Collection-Specific Organization
- Manual ordering mode inside a collection (drag reorder).
- Alternative sort modes available when needed.
- Collection page supports grid/list view toggle.

## Sorting & Filtering
- Sort options across views:
  - Date added (newest/oldest)
  - Date modified (newest/oldest)
  - Title (A-Z / Z-A)
- Filter by one or multiple collections.
- Include/exclude uncollected items.

## Search & Rediscovery
- Dedicated search view.
- Global search across item title, description, and URL text.
- Search works with both grid and list presentation.

## Navigation & Flow
- Top navigation with quick search access.
- Sidebar with collection access.
- Item-open state is URL-based, so context is preserved when navigating.
- Mobile menu behavior for small screens.

## Visual / UX Requirements
- Keep dark visual language and minimal, distraction-free UI.
- Preserve dense but readable masonry feel.
- Card proportions and spacing should prioritize image-first exploration.
- Keep fast interactions: add, open, edit, close, continue browsing.

## Mobile Expectations
- Fully usable in mobile browser.
- Responsive grid/list behavior.
- Modal/editor usable on small screens.
- Touch-friendly actions for add, open, reorder, and delete.

## Persistence Expectations
- Data must be stored and survive refresh/revisit.
- Saved data includes:
  - Items
  - Collections
  - Collection memberships
  - Manual ordering positions
  - View preferences (sort/view/filter states)

## Preference Memory
- Remember view mode per section.
- Remember sort mode per section/collection.
- Remember filter selection state.

## Quality Bar
- Adding multiple images should not freeze or silently fail.
- Loading states should be clear and not get stuck.
- Error states should be human-readable.
- Browsing should stay smooth even with large inspiration libraries.
