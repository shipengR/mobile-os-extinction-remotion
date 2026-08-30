Mobile OS Extinction — Remotion

1. Create a Remotion starter project: `npx create-video@latest`.
2. Copy `src.tsx` into the starter project (or import `RemotionRoot` from it in `src/Root.tsx`).
3. Ensure `src/Root.tsx` exports `RemotionRoot` as the default root component, for example:
   `import {RemotionRoot} from './src'; export default RemotionRoot;`
4. Run `npm run dev` to preview.
5. Render with `npx remotion render src/index.tsx MobileOSExtinction out/mobile-os-extinction.mp4` (use the entry file used by your starter project).

The composition is 1920×1080, 30fps, 16 seconds. All artwork is inline React/CSS: no assets, GSAP, or external fonts are required. The palette and 0.8px borders are defined at the top of `src.tsx`.