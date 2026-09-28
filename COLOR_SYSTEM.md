# Library color system

All interface colors use neutral OKLCH (C=0), so saved media supplies the color. Light and dark values are paired by semantic role.

| Before | After |
| --- | --- |
| `#232323`, `#222`, `#333`, `#444`, `#454545` | `--ink` semantic token (values below) |
| `#868686`, `#777`, `#888`, `#999`, `#666`, `#555`, `#8a8a8a`, `#929292`, `#626262`, `#6b6b6b`, `#5f5f5f` | `--muted` semantic token (values below) |
| `#e9e9e9`, `#ddd`, `#e7e7e7`, `#e8e8e8` | `--line` semantic token (values below) |
| `#fff` | `--canvas` semantic token (values below) |
| `#f3f3f3`, `#f0f0f0`, `#f5f5f5`, `#f2f2f2`, `#ededed`, `#f8f8f8`, `#f6f5f2`, `#f4f4f4`, `#eee`, `#f1f1f1` | `--soft` semantic token (values below) |
| `#e2e2e2` | `--hover` semantic token (values below) |
| `#fffffff5` | `--header` semantic token (values below) |
| `#fffffff2` | `--floating` semantic token (values below) |
| `#e9e9e9b8`, `#edededf5` | `--backdrop` semantic token (values below) |
| `#ffffffb3` | `oklch(1 0 0 / 0.7)` (same fixed media-overlay/shadow role) |
| `#ffffff70` | `oklch(1 0 0 / 0.44)` (same fixed media-overlay/shadow role) |
| `#ffffff50` | `oklch(1 0 0 / 0.31)` (same fixed media-overlay/shadow role) |
| `#0006` | `oklch(0 0 0 / 0.4)` (same fixed media-overlay/shadow role) |
| `#0007` | `oklch(0 0 0 / 0.467)` (same fixed media-overlay/shadow role) |
| `#0009` | `oklch(0 0 0 / 0.6)` (same fixed media-overlay/shadow role) |
| `#0000001a` | `oklch(0 0 0 / 0.102)` (same fixed media-overlay/shadow role) |
| `#0000000d` | `oklch(0 0 0 / 0.051)` (same fixed media-overlay/shadow role) |
| `#00000008` | `oklch(0 0 0 / 0.031)` (same fixed media-overlay/shadow role) |
| `white` login-button text | `--inverse` |
| Black image outlines at 6%/10% | `--image-edge`: black 6% light / white 8% dark |
| Black icons on all surfaces | Monochrome UI icons invert only in dark mode |

| Token | Light | Dark |
| --- | --- | --- |
| `canvas` | `oklch(0.985 0 0)` | `oklch(0.18 0 0)` |
| `surface` | `oklch(0.995 0 0)` | `oklch(0.215 0 0)` |
| `soft` | `oklch(0.965 0 0)` | `oklch(0.25 0 0)` |
| `hover` | `oklch(0.935 0 0)` | `oklch(0.29 0 0)` |
| `selected` | `oklch(0.915 0 0)` | `oklch(0.32 0 0)` |
| `ink` | `oklch(0.28 0 0)` | `oklch(0.94 0 0)` |
| `muted` | `oklch(0.46 0 0)` | `oklch(0.8 0 0)` |
| `line` | `oklch(0.9 0 0)` | `oklch(0.34 0 0)` |
| `focus` | `oklch(0.52 0 0)` | `oklch(0.72 0 0)` |
| `inverse` | `oklch(0.995 0 0)` | `oklch(0.18 0 0)` |
| `header` | `oklch(0.985 0 0 / 0.97)` | `oklch(0.18 0 0 / 0.97)` |
| `floating` | `oklch(0.995 0 0 / 0.97)` | `oklch(0.215 0 0 / 0.97)` |
| `backdrop` | `oklch(0.955 0 0 / 0.97)` | `oklch(0.16 0 0 / 0.97)` |
| `image-edge` | `oklch(0 0 0 / 0.06)` | `oklch(1 0 0 / 0.08)` |

## Contrast validation

| Theme and role | Worst surface | WCAG ratio | APCA Lc |
| --- | --- | --- | --- |
| Light Body | Selected control | 11.34:1 | 84.8 |
| Light Secondary labels | Selected control | 5.54:1 | 68.1 |
| Light Focus ring | Selected control | 4.28:1 | 60.9 |
| Dark Body | Selected control | 10.64:1 | 89.0 |
| Dark Secondary labels | Selected control | 6.79:1 | 61.4 |
| Dark Focus ring | Selected control | 5.11:1 | 47.4 |

Appearance controls: System (default), Light, Dark. Selection is stored locally per browser and reflected across tabs. Source images/videos are not recolored. Contrast values are palette checks, not a full accessibility certification.
