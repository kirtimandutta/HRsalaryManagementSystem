# Mobile responsiveness audit

Audited in the running app with device emulation, then checked by using the pages rather than only looking at a screenshot.

## Devices tested

| Viewport | Size | What was exercised |
| --- | --- | --- |
| Phone | 375 × 812 | Directory cards, menu drawer, filters toggle, salary editor, overview charts, analytics cards, Ask the Org |
| Tablet | 768 × 1024 | Wrapping navigation, directory table inside its scroller, hidden phone cards |
| Desktop | 1280 × 800 | Persistent sidebar, four metric cards on one row, no page-level horizontal scroll |

Page scroll width stayed equal to the viewport at all three sizes. The salary edit control measures 44 × 44. The phone salary sheet fills the viewport (375 × 812) and the Save button stays on screen.

## Key mobile UX issues fixed

- **Directory table.** Below 768px the 10,000-row list is a card per employee: name, id, role, country, base, total, status, and an edit button. From 768px up the table returns, with band and base columns revealed only when there is room. Wide tables sit in a scroller that shows an edge shadow instead of stretching the page.
- **Filters.** The filter form is closed on phone and tablet so the records come first. A Filters button shows how many filters are active. At 1280px the form stays open beside the table.
- **Navigation.** Under 768px a menu button opens a left drawer with the four sections and closes from the backdrop, the close button, or Escape. From 768px to 1279px the sections are a wrapping row of 44px links. The sidebar returns at 1280px. A sidebar at 768px would leave the directory too narrow, so it starts at the desktop breakpoint.
- **Header.** The title truncates instead of pushing the profile off screen. “HR Manager” is hidden under 640px; the initials stay visible.
- **Metrics.** Overview cards are one column, then two from 640px, then four from 1024px. The annual payroll figure (`$1,202,443,757`) stays on one line inside its card at 375px and at 1280px.
- **Charts.** Under 768px bar charts switch to horizontal bars with the department or country name on the axis, so labels do not stack on top of each other. Tooltips can extend outside the plot.
- **Analytics tables.** Department spending and highest earners become stacked cards under the tablet and phone breakpoints. The department-by-band matrix still scrolls sideways, with a “Swipe sideways” hint and an edge shadow.
- **Salary editor.** On a phone the editor is a full-height sheet. The form scrolls and Cancel / Save stay pinned, including the safe-area inset. From 640px up it is a right-hand drawer again.
- **Ask the Org.** The Ask button is full width on a phone and 44px tall. Sample questions use the same touch height. Matching employees render as cards under 640px.
- **Type and controls.** Page titles step from `text-2xl` to `text-4xl`. Inputs are 44px tall and 16px on small screens so iOS does not zoom the field. Pagination and sort headers meet the same touch size.

## Verification steps

1. Start the app with `npm run dev` and open `http://localhost:3000`.
2. In Chrome DevTools, toggle the device toolbar.
3. Set **375 × 812**. Open the menu, close it, open Filters, page the directory, and edit a salary. Confirm Save is visible and the page does not scroll sideways. Check Overview, Analytics, and Ask the Org the same way.
4. Set **768 × 1024**. Confirm the wrapping nav, the directory table (cards hidden), and that any extra columns scroll inside the table.
5. Set **1280 × 800** or use a normal desktop window. Confirm the sidebar, four metric cards on one row, and the filter column beside the directory.
6. On a phone, repeat the directory edit with the keyboard open. The form should scroll and the actions should remain reachable.
