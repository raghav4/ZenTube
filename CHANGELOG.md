# Changelog

All notable changes to ZenTube are documented here.

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
