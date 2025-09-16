// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightSidebarTopics from "starlight-sidebar-topics";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Briefdocs",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/stefan-kai5er",
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
