# Justice AI visual layer

No animation dependency is needed. `app/visual.css` adds glass surfaces and CSS motion to the existing layout. It is imported after `globals.css`; the existing spacing, dimensions, flex/grid rules, DOM hierarchy and application logic stay in their original files.

The palette uses midnight navy (`#0b1425`), existing paper white, slate-blue (`#3362b1`), restrained teal (`#1c868a`) and Justice AI gold (`#e1ba70`). The existing Segoe UI typography, heading sizes and serif document text remain. Light and dark themes supply separate glass opacity, borders and glow tokens. The mesh is static to avoid continuous background repainting. Main surfaces blur the background; chat bubbles use tinted surfaces without another blur layer.

Use these classes on existing elements, keeping their current layout classes:

```tsx
// Card: retain the existing padding, radius and border-width classes.
<section className="card-surface p-6">...</section>
// Or add glass-card to an existing styled panel.
<section className={`${styles.panel} glass-card`}>...</section>

// Existing chat already receives the styling. glass-chat is a reusable surface.
<section className="justice-chat-panel">...</section>

// Retain the current input sizing and padding.
<input className="input-field glass-input" />
```

The shared surface rules use `var(--glass-bg)`, `backdrop-filter: blur(18px) saturate(125%)`, a translucent border colour and an inset highlight plus soft shadow. Chat/sidebar surfaces use the stronger `--glass-strong` token and 24px blur. Inputs use `--glass-inset`, rounded corners, a visible focus outline and `--glass-glow` for the focus ring. Each utility deliberately leaves width, height, padding and display to existing styles.

Apply staggered entrances directly to existing mapped items:

```tsx
import type { CSSProperties } from "react";

{items.map((item, index) => (
  <article
    key={item.id}
    className={`${styles.existingItem} motion-item`}
    style={{ "--motion-index": Math.min(index, 7) } as CSSProperties}
  >
    {item.content}
  </article>
))}
```

`motion-item` fades and moves 7px over 340ms, with 45ms between items. Delays are capped in the actual chat and review maps. CSS animates newly mounted items; streamed text updates do not replay a bubble's entrance. Route roots have a separate 380ms entrance. No extra wrapper, router key, exit animation or remounting of persistent chat state is introduced.

Hover uses a small CSS lift and scale, with a short press response. It does not track the pointer; true cursor-following magnetic effects would need JavaScript and are unnecessary for these controls. Motion is limited to devices with a fine pointer for hover, disabled for reduced-motion preferences, and does not transition sizes or grid geometry. Reduced-transparency and forced-colour modes receive opaque surfaces. Browsers without backdrop-filter support use solid surface colours.

The changes in `ChatExperience.tsx` and the draft review page add only animation classes, inline delay variables and a type import. No provider, upload, authentication, speech, persistence or case behaviour is changed.
