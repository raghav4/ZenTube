# Changelog

All notable changes to ZenTube are documented here.

## [1.1.1] — 2026-07-04

### Fixes

- **Limit overlay — Snooze instead of all-day dismiss** — "Keep watching anyway" used to disable the daily wall for the rest of the day. It's now a **Snooze 5 min** button: the overlay hides, you get five more minutes (shown as a countdown in the timer pill), and then the wall returns. A quieter "I'm done for today" link still lets you fully dismiss when you actually mean it.
- **Live toggle** — changing any setting in the popup now applies instantly to the active YouTube tab without a page refresh. The popup sends settings directly to the content script as a fast path on top of the existing storage event.
- **Refresh tab notice** — if the content script is unreachable (e.g. the extension was reloaded while the tab was open), the popup shows a "Refresh this tab to activate ZenTube" banner with a one-click Refresh button.
- **Video-aware timer** — on watch pages, the countdown only ticks while the video is actually playing. Pausing pauses your limit; switching tabs while something plays keeps counting.
- **Overlay scrollbar** — the page body is now scroll-locked while the limit wall is visible. No more background scrollbar peeking through.
- **Timer pill hidden during overlay** — the countdown pill no longer floats over the limit wall; it hides when the wall appears and reappears once dismissed.
- **Limit indicator** — when the daily limit is reached, the pill shows `∞` with a slow breathing animation instead of a static "Done" label.

## [1.1.0] — 2026-07-04

### Features

- **Thumbnail Dimming** — grayscale or blur feed, search, and sidebar thumbnails until you hover, so clickbait stops pulling your eye. Choose None, Grayscale, or Blur.
- **Disable Hover Previews** — stops the inline video and animated-thumbnail preview that auto-play when the cursor lingers on a thumbnail.
- **Keyboard Shortcut** — toggle ZenTube on or off with a hotkey (default `Ctrl/Cmd+Shift+Y`, rebindable at `chrome://extensions/shortcuts`). The popup shows the live binding.
- **Appearance Control** — Auto / Light / Dark popup theme. Auto follows your system, so no more bright flash at night.

### Improvements

- **Privacy, stated up front** — the popup, landing page, and README now make it clear that nothing leaves your device: no analytics, no accounts, no servers, and the only permission requested is YouTube.
- **Cleaner popup** — the footer was redesigned from a cluttered stack into a compact layout.
- Removed the "Unstable" tag from Hide Shorts Videos.

## [1.0.0] — 2026-05-30

### Features

- **Hide Feed** — blank the homepage so YouTube opens without pulling you in
- **Disable Autoplay** — stops the auto-next mechanism on every video
- **Daily Time Limit** — countdown pill in the corner; full-screen overlay pauses the video when time's up; clock stops until dismissed
- **Focus Time Tracking** — tracks today's and total focused time on YouTube, shown in the popup stat bar
- **Hide Sidebar Videos** — removes the "Up Next" panel while watching
- **Hide End Screens** — blocks clickbait cards in the last 20 seconds of videos
- **Hide Shorts** — removes Shorts from feed and hides the Shorts tab
- **Hide Comments** — removes the comments section entirely
- **Hide Notification Bell** — removes the notification button from the header
- **Hide Subscriptions Tab** — hides the subscriptions feed entry and full channel list in the sidebar
- **Hide Live Chat** — removes live chat on livestreams
- **Hide Merch** — removes the merch shelf below videos
- **Hide Sidebar Playlists** — removes playlist panels while watching
- **Disable Playlists** — strips `?list=` params so videos always play standalone
- **Smart Presets** — Light, Balanced, Zen; one click to the right setup; auto-detects active preset
- **Section Toggle-All** — click any card header to flip the whole group on or off
- **Dynamic Toolbar Icon** — swaps between on/off icon states
- **SPA-Aware** — state persists through YouTube's in-page navigation via `yt-navigate-finish`
- **Tab Visibility Sync** — re-applies classes and restarts timer on tab focus
