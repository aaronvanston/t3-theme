# t3-theme

A theme for T3 Code: the app's stock look, with [Arbor](https://github.com/aaronvanston/arbor)'s green as the accent and tighter thread rows in the sidebar.

## What it changes

- **Colours.** T3 Code's default light and dark palettes, with the blue swapped for Arbor's green: the send button, focus rings, update notices and the terminal cursor.
- **Sidebar thread rows.** Two lines where the app draws three. The title is on the first line with the time; the project name and details are on the second.
- **Hover actions.** Snooze and settle appear over the end of the second line, so the title never gets cut short.

Light and dark are both included.

## Install

1. Download [`t3-theme.json`](https://raw.githubusercontent.com/aaronvanston/t3-theme/main/t3-theme.json).
2. In T3 Code, open **Settings → Appearance** and click **Add a theme**.
3. Drop the file in, or paste its contents into **Theme JSON**, then pick **Arbor**.

## Edit and build

| File | What it holds |
| --- | --- |
| `theme.json` | The theme's name and its colours, one per role, for dark and for light. |
| `theme.css` | The CSS, written out with comments. |
| `t3-theme.json` | The built theme: `theme.json` plus the CSS minified into one `css` string. This is the file T3 Code imports. |
| `build.mjs` | The build. |

Change `theme.json` or `theme.css`, then run:

```sh
node build.mjs
```

It needs Node and nothing else. The build stops with a message when a colour role is misspelt, a colour is not a literal one, the CSS has an unclosed brace, or the CSS uses something T3 Code will not load (`@import`, `image-set()`, a `url()` that is not a `data:` address). `node build.mjs --check` fails when `t3-theme.json` is out of date.

## Where the colours come from

- The neutrals are T3 Code's own default palette, so the theme looks like the app with no theme set.
- The green is Arbor's default colour, from [`src/styles.css`](https://github.com/aaronvanston/arbor/blob/main/src/styles.css): `oklch(0.76 0.12 172)` on dark (`#4fcaa8`) with `oklch(0.22 0.04 180)` text on it, and `oklch(0.5 0.1 180)` on light (`#007565`) with white text.

## Notes

- Tested on T3 Code Nightly `0.1.10-nightly.20261115`.
- The sidebar rules style the app through its internal class names, not the selectors T3 Code documents as stable, so an update to T3 Code can break them. `theme.css` says what each rule expects.
- Themes apply to T3 Code on web and desktop. The mobile app does not use them.

## Credits

The two-line thread row comes from [T3 Clawd](https://github.com/rohit3a/t3-clawd) by rohit3a (MIT).

## License

MIT. See [LICENSE](LICENSE).
