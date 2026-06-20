import type { Config } from "tailwindcss";

import preset from "@theourgia/shared/tokens/tailwind-preset";

export default {
  content: ["./src/**/*.{astro,html,ts,tsx,md,mdx}"],
  presets: [preset],
} satisfies Config;
