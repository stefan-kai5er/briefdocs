// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightSidebarTopics from "starlight-sidebar-topics";
import starlightMarkdownBlocks, { Aside } from "starlight-markdown-blocks";
import starlightLinksValidator from "starlight-links-validator";
import icon from "astro-icon";

import react from "@astrojs/react";

const SITE_URL = "https://briefdocs.org";
const SITE_DESCRIPTION =
  "Kurze, auf den Punkt gebrachte Notizen, Snippets und Anleitungen — vom 3D-Druck bis zur Konfiguration.";

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  vite: {
    build: {
      // Betrifft das three.js-Bundle des 3D-Viewers, nicht die Modelle.
      // ~1 MB ist fuer three unvermeidbar; der Viewer laedt per
      // client:visible erst, wenn er in den Viewport kommt.
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
      include: {
        mdi: ["printer-3d-nozzle-outline", "information-outline"],
      },
    }),
    starlight({
      title: "Briefdocs",
      description: SITE_DESCRIPTION,
      favicon: "/favicon.svg",
      customCss: ["./src/styles/assembly-viewer.css"],
      // Ein-Klick-Bearbeiten auf jeder Seite -- genau der Beitrags-Weg,
      // den die README beschreibt.
      editLink: {
        baseUrl: "https://github.com/stefan-kai5er/briefdocs/edit/master/",
      },
      // Bei einer Wissensbasis muss man den Stand einer Notiz einschaetzen
      // koennen. Das Datum kommt aus der Git-Historie.
      lastUpdated: true,
      head: [
        { tag: "meta", attrs: { property: "og:type", content: "website" } },
        { tag: "meta", attrs: { property: "og:site_name", content: "Briefdocs" } },
        { tag: "meta", attrs: { property: "og:image", content: `${SITE_URL}/og-default.png` } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { property: "og:locale", content: "de_DE" } },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
        { tag: "meta", attrs: { name: "twitter:image", content: `${SITE_URL}/og-default.png` } },
      ],
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
                label: "Grundlagen",
                autogenerate: { directory: "ueber-briefdocs" },
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
        starlightLinksValidator(),
      ],
    }),
    react(),
  ],
});
