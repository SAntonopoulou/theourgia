import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://docs.theourgia.com",
  integrations: [
    starlight({
      title: "Theourgia",
      description:
        "A magickal journal CMS and full practitioner toolkit. Open source, federated, self-hostable. AGPL-3.0.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/SAntonopoulou/theourgia",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/SAntonopoulou/theourgia/edit/main/docs/site/",
      },
      lastUpdated: true,
      pagination: true,
      defaultLocale: "en",
      locales: {
        en: { label: "English", lang: "en" },
      },
      // The User / Admin / Developer / Ops sections autogenerate from the
      // real repository docs, which `scripts/sync-docs.mjs` copies into
      // src/content/docs/<section>/ (with frontmatter) before every build.
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "About Theourgia", link: "/" },
            { label: "Status & roadmap", link: "/start/status/" },
            { label: "Privacy & your data", link: "/start/privacy/" },
            { label: "Theourgia for practitioners", link: "/user/" },
          ],
        },
        {
          label: "Using Theourgia",
          collapsed: false,
          items: [{ autogenerate: { directory: "user" } }],
        },
        {
          label: "Self-Hosting & Operations",
          collapsed: false,
          items: [
            {
              label: "Runbooks & guides",
              items: [{ autogenerate: { directory: "admin" } }],
            },
            {
              label: "Operations log",
              items: [{ autogenerate: { directory: "ops" } }],
            },
          ],
        },
        {
          label: "Developer",
          collapsed: false,
          items: [
            {
              label: "Building on Theourgia",
              items: [{ autogenerate: { directory: "developer" } }],
            },
            {
              label: "Substrate internals",
              items: [{ autogenerate: { directory: "dev" } }],
            },
          ],
        },
        {
          label: "Reference",
          collapsed: false,
          items: [
            { label: "API reference", link: "/reference/api/" },
            { label: "API endpoints", link: "/reference/api-endpoints/" },
            { label: "Architecture overview", link: "/concepts/architecture/" },
            { label: "Feature catalog", link: "/concepts/features/" },
          ],
        },
      ],
      head: [
        // No analytics. No tracking. No third-party scripts.
        //
        // First-paint tradition apply — runs before any framework hydrates
        // so the persisted `theourgia.theme` lands on `<html data-tradition>`
        // before the first paint, preventing a Base → Hel/Thel flash.
        // Mirrors `frontend/shared/src/tokens/first-paint.js` for the
        // tradition attribute only; Starlight owns its own `data-theme`
        // (dark/light).
        {
          tag: "script",
          content:
            '(function(){if(typeof document==="undefined"||typeof localStorage==="undefined")return;try{var v=localStorage.getItem("theourgia.theme");if(["base","hellenic","thelemic"].indexOf(v)<0)v="base";document.documentElement.setAttribute("data-tradition",v);}catch(_){document.documentElement.setAttribute("data-tradition","base");}})();',
        },
      ],
      customCss: [
        // Theourgia design system → Starlight token bridge.
        // See Theourgia Docs.dc.html for the visual target.
        "./src/styles/theourgia.css",
      ],
      components: {
        // Tradition cycler (Base / Hel / Thel) sits beside Starlight's
        // stock theme select. The wrapper composes both.
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
    }),
  ],
});
