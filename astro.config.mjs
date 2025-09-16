// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightSidebarTopics from "starlight-sidebar-topics";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "My Docs",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/withastro/starlight",
        },
      ],
      plugins: [
        starlightSidebarTopics([
          {
            label: "Guides",
            link: "/guides/example",
            icon: "open-book",
            items: [
              { label: "Reference", autogenerate: { directory: "guides" } },
            ],
          },
          {
            label: "Reference",
            link: "/reference/example",
            icon: "information",
            items: [
              { label: "Reference", autogenerate: { directory: "reference" } },
            ],
          },
        ]),
      ],
    }),
  ],
});
