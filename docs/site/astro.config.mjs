import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  site: "https://docs.theourgia.com",
  integrations: [
    starlight({
      title: "Theourgia",
      description:
        "A magickal journal CMS and full practitioner toolkit. Open source, federated, self-hostable. AGPL-3.0.",
      social: {
        github: "https://github.com/SAntonopoulou/theourgia",
      },
      editLink: {
        baseUrl:
          "https://github.com/SAntonopoulou/theourgia/edit/main/docs/site/",
      },
      lastUpdated: true,
      pagination: true,
      defaultLocale: "en",
      locales: {
        en: { label: "English", lang: "en" },
      },
      sidebar: [
        {
          label: "Start",
          items: [
            { label: "About Theourgia", link: "/" },
            { label: "Status & Roadmap", link: "/start/status/" },
            { label: "Privacy", link: "/start/privacy/" },
          ],
        },
        {
          label: "User Guide",
          collapsed: false,
          autogenerate: { directory: "user" },
        },
        {
          label: "Admin Guide (self-hosting)",
          collapsed: false,
          autogenerate: { directory: "admin" },
        },
        {
          label: "Developer Guide",
          collapsed: false,
          autogenerate: { directory: "developer" },
        },
        {
          label: "Concepts",
          collapsed: true,
          items: [
            { label: "Architecture overview", link: "/concepts/architecture/" },
            { label: "Feature catalog", link: "/concepts/features/" },
          ],
        },
      ],
      head: [
        // No analytics. No tracking. No third-party scripts.
        // The empty array is the point.
      ],
      customCss: [
        // Design system tokens will land here when the design system ships.
      ],
      components: {
        // Overrides will be added as the design system matures.
      },
    }),
  ],
});
