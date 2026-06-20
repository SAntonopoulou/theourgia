import type { Config } from "tailwindcss";

import preset from "@theourgia/shared/tokens/tailwind-preset";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../shared/src/**/*.{ts,tsx}"],
  presets: [preset],
} satisfies Config;
