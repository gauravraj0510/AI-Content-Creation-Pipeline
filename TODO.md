## Fronted:-
- A simple only Sign-in UI.

- A web page to show all RAW_IDEAS title with relevance score > 75 with option to approve

- A web page with reel ideas grouped by RAW_IDES doc id.
- - Each reel idea will be editable to make final changes in App
- - Approved for Production toggle (by default NO)

- A separate web page for reels selected for Production (to manage Production status).

## Backend:-
- Script which checks for all RAW_IDEAS which has `human_approved = true` and `reel_generated = false`
- It will generate 3 reels and update `reel_generated = true`
- Each reel will have 2 status variables `production_approved = false` and `production_status = ""`