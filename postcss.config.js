
import autoprefixer from "autoprefixer";
import lightningcssPlugin from "postcss-lightningcss";

export default {
  plugins: [
    autoprefixer({
      overrideBrowserslist: [
        "last 2 versions",
        "not dead",
        "not < 0.5%",
        "Firefox ESR"
      ],
      grid: "autoplace",
      flexbox: "no-2009"
    }),
    // Заменяем cssnano на lightningcss
    lightningcssPlugin({
      browsers: "last 2 versions, not dead, not < 0.5%, Firefox ESR",
      minify: true
    })
  ]
};