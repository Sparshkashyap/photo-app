import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    nitro({
      config: {
        preset: "aws_amplify",
        awsAmplify: {
          runtime: "nodejs24.x",
        },
      },
    }),
  ],

  tanstackStart: {
    server: {
      entry: "server",
    },

    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
        crawlLinks: false,
        retryCount: 0,
      },
    },
  },
});