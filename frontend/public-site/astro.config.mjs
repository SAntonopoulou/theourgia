import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: 4321,
  },
});
