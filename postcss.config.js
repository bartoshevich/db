
import autoprefixer from "autoprefixer";
import lightningcssPlugin from "postcss-lightningcss";
import cssnano from "cssnano";

const isProd = process.env.ELEVENTY_ENV === "production";

export default {
  plugins: [
    autoprefixer({
      overrideBrowserslist: [
        "last 2 versions",
        "not dead",
        "not < 0.5%",
        "Firefox ESR",
        "not IE 11"
      ],
      grid: "autoplace",
      flexbox: "no-2009"
    }),
    
    // Условная минификация только для продакшена
    ...(isProd ? [
      lightningcssPlugin({
        browsers: "last 2 versions, not dead, not < 0.5%, Firefox ESR",
        minify: true
      }),
      cssnano({
        preset: ['advanced', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
          colormin: true,
          convertValues: true,
          discardDuplicates: true
        }]
      })
    ] : [])
  ]
};