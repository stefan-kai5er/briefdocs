// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightSidebarTopics from "starlight-sidebar-topics";
import starlightMarkdownBlocks, { Aside } from "starlight-markdown-blocks";
import icon from "astro-icon";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  vite: {
    build: {
      chunkSizeWarningLimit: 1500,
    },
  },
  markdown: {
    remarkRehype: {
      footnoteLabel: "Fußnoten",
    },
  },

  integrations: [
    icon({
      //include: {
      // Include only three `mdi` icons in the bundle
      //mdi: ["account", "account-plus", "account-minus"],
      //},
    }),
    starlight({
      title: "Briefdocs",
      favicon: "/favicon.svg",
      locales: {
        root: {
          label: "Deutsch",
          lang: "de",
        },
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/stefan-kai5er/briefdocs",
        },
      ],
      components: {
        Sidebar: "./src/components/Sidebar.astro",
      },
      plugins: [
        starlightSidebarTopics([
          {
            label: "3D-Druck",
            link: "/3d-druck/",
            icon: "mdi:printer-3d-nozzle-outline",
            items: [
              {
                label: "How-To",
                autogenerate: { directory: "/3d-druck/how-to" },
              },
            ],
          },
          {
            label: "Über Briefdocs",
            link: "/ueber-briefdocs/was-ist-ein-briefdoc",
            icon: "mdi:information-outline",
            items: [
              {
                label: "Was ist ein Briefdoc?",
                link: "/ueber-briefdocs/was-ist-ein-briefdoc",
              },
            ],
          },
        ]),
        starlightMarkdownBlocks({
          blocks: {
            briefing: Aside({
              label: "Briefing",
              color: "blue",
              icon: '<svg viewBox="0 -960 960 960" width="24" height="24" fill="currentColor" class="starlight-aside_icon"><path d="M551-800H280v-80h351l-80 80ZM391-640H160v-80h311l-80 80ZM231-480H40v-80h271l-80 80Zm353 80L480-504 280-304l104 104 200-200Zm-47-161 104 104 199-199-104-104-199 199Zm-84-28 216 216-229 229q-24 24-56 24t-56-24l-2-2-26 26H100l126-126-2-2q-24-24-24-56t24-56l229-229Zm0 0 227-227q24-24 56-24t56 24l104 104q24 24 24 56t-24 56L669-373 453-589Z"/></svg>',
            }),
            success: Aside({
              label: "Erfolg",
              color: "green",
              icon: '<svg viewBox="0 -830 960 960" width="24" height="16" fill="currentColor" class="starlight-aside__icon"><path d="M388-226v-106h268v106H388Zm-146 0L-10-478l75-75 177 177 375-375 75 75-450 450Zm308-162v-106h270v106H550Zm164-164v-106h268v106H714Z"/></svg>',
            }),
          },
        }),
      ],
    }),
    react(),
  ],
});
