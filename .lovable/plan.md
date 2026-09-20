# Move seller help into the shortcut row

## Changes
- Remove the two large Selling calculator card; keep the How it works card unchanged.
- Removlculator and How it works cards from the home page.
- Add both as compact icon pills in the same horizontal row as the category buttons, matching the reference image.
- Keep each pill linked to its existing calculator or instructions tab.
- Preserve horizontal scrolling on smaller screens.

## Technical details
- Extend the category-chip component with link-style shortcut pills.
- Remove the obsolete home-card icons and markup.
- Verify the home page at the current compact viewport and confirm both destinations still open.
