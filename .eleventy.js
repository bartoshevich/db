import path from "path";
import * as sass from 'sass';
import { URL } from "url";
import * as Terser from "terser";
import htmlmin from "html-minifier-terser";
import { DateTime } from "luxon";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import sitemap from "@quasibit/eleventy-plugin-sitemap";
import Image from "@11ty/eleventy-img";
import postcss from "postcss";
import * as Nunjucks from "nunjucks";
import pluginRss from "@11ty/eleventy-plugin-rss";
import { transform } from "lightningcss";



const isProdBuild = process.env.ELEVENTY_ENV === "production";
const isProduction = process.env.NODE_ENV === "production";


export default function (eleventyConfig) {

  const buildVersion = DateTime.now().toFormat("yyyyMMddHHmmss");
  eleventyConfig.addGlobalData("buildVersion", buildVersion);



  /* ---------------- Paths ---------------- */
  const inputDir = "src";
  const includesDir = "_includes";
  const layoutsDir = "_layouts";
  const outputDir = "_site";
  const dataDir = "_data";

  /* ------------- Nunjucks -------------- */
  const loader = new Nunjucks.FileSystemLoader(
    [
      path.resolve(inputDir, layoutsDir),
      path.resolve(inputDir, includesDir),
      path.resolve(inputDir)
    ],
    { watch: !isProduction, noCache: isProduction }
  );
  const nunjucksEnv = new Nunjucks.Environment(loader);
  eleventyConfig.setLibrary("njk", nunjucksEnv);

  /* --------------- Plugins --------------- */
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(eleventyNavigationPlugin);  
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addPlugin(sitemap, {
   lastModifiedProperty: "last_modified_at",
    sitemap: { hostname: "https://bartoshevich.by" }
  });
 


  /* ------------- Shortcodes ------------- */
  async function imageShortcode(
    src,
    alt,
    sizes,
    widths = [414, 640, 800, 1366],
    formats = ["avif", "webp", "jpeg"],
    cssClass = ""
  ) {
    if (!alt) throw new Error(`Missing alt for image shortcode: ${src}`);
    const metadata = await Image(src, {
      widths,
      formats,
      outputDir: `${outputDir}/assets/images/optimized/`,
      urlPath: "/assets/images/optimized/",
      fileSuffixTemplate: "-[width]w.[format]"
    });
    const lowsrc = metadata.jpeg?.[0] ?? Object.values(metadata)[0][0];
    const srcsetFor = (f) =>
      f ? Object.values(f).map((img) => img.srcset).join(", ") : "";
    const sources = Object.values(metadata)
      .map(
        (f) =>
          srcsetFor(f)
            ? `<source type="${f[0].sourceType}" srcset="${srcsetFor(
                f
              )}" sizes="${sizes}">`
            : ""
      )
      .join("\n");
    const primarySrcset = srcsetFor(metadata.jpeg) || srcsetFor(metadata.webp);
    return `<picture>\n${sources}\n<img src="${lowsrc.url}" width="${lowsrc.width}" height="${lowsrc.height}" alt="${alt}" loading="lazy" decoding="async"${
      cssClass ? ` class="${cssClass}"` : ""
    } sizes="${sizes}" srcset="${primarySrcset}" itemprop="contentUrl">\n</picture>`;
  }
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);

  /* -------------- Filters --------------- */

  eleventyConfig.addLiquidFilter("dateToRfc3339", pluginRss.dateToRfc3339);
	eleventyConfig.addLiquidFilter("dateToRfc822", pluginRss.dateToRfc822);

  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  eleventyConfig.addFilter("limit", (arr, n) => arr.slice(0, n));
  eleventyConfig.addFilter("decodeEntities", (v) =>
    v
      .replace(/&nbsp;/g, "\u00A0")
      .replace(/&mdash;/g, "—")
      .replace(/&laquo;/g, "«")
      .replace(/&raquo;/g, "»")
      .replace(/&ouml;/g, "ö")
  );
  eleventyConfig.addFilter("absoluteUrl", (url, base) => {
    try { return new URL(url, base).href; } catch { return url; }
  });
  eleventyConfig.addFilter("setAttribute", (obj, key, value) => ({ ...obj, [key]: value }));
  const parseDate = (d) => {
    if (d instanceof Date) return DateTime.fromJSDate(d);
    if (typeof d === "string") return (
      DateTime.fromISO(d) || DateTime.fromRFC2822(d) || DateTime.fromSQL(d)
    );
    return null;
  };
  eleventyConfig.addFilter("htmlDateString", (d) => {
    const dt = parseDate(d);
    return dt?.isValid ? dt.toISODate() : d;
  });
  eleventyConfig.addFilter("isoDate", (d) => {
    const dt = parseDate(d);
    return dt?.isValid ? dt.toISO() : d;
  });
  eleventyConfig.addFilter("readableDateRU", (d) => {
    const dt = parseDate(d);
    return dt?.isValid ? dt.setLocale("ru").toFormat("d MMMM yyyy") : d;
  });
  eleventyConfig.addFilter("jsonify", (o) => JSON.stringify(o));

  /* --------------- Globals --------------- */
  eleventyConfig.addNunjucksGlobal("getBreadcrumbs", (key, items) => {
    if (!key || !items?.[Symbol.iterator]) return [];
    const map = new Map(items.map((i) => [i.data?.eleventyNavigation?.key, i]));
    const crumbs = []; let safety=10;
    while (key && safety--) {
      const item = map.get(key);
      if (!item) break; crumbs.unshift(item);
      key = item.data?.eleventyNavigation?.parent;
    }
    return crumbs;
  });



  /* -------------- Оптимизация встроенных стилей (в HTML) -------------- */
  eleventyConfig.addTransform("optimizeInlineStyles", (content, outputPath) => {
    if (outputPath && outputPath.endsWith(".html")) {
     
      return content.replace(/<style>([\s\S]*?)<\/style>/g, (match, cssContent) => {
        try {
          // Оптимизируем CSS внутри style блоков
          const { code } = transform({
            code: Buffer.from(cssContent),
            minify: true
          });
          return `<style>${code}</style>`;
        } catch (error) {
          console.warn("Ошибка при оптимизации встроенных стилей:", error);
          return match; 
        }
      });
    }
    return content;
  });


  /* ------------ Collections ------------ */
  eleventyConfig.addCollection("navigationItems", (api) =>
    api.getAllSorted().filter((i) => i.data?.eleventyNavigation?.key)
  );
  eleventyConfig.addCollection("post", (collectionApi) =>
    collectionApi
      .getFilteredByGlob(`${inputDir}/_posts/**/*.njk`)
  );


/* --------------- SCSS ----------------- */
eleventyConfig.addTemplateFormats("scss");
eleventyConfig.addExtension("scss", {
  // После компиляции .scss будет .css
  outputFileExtension: "css",


  compile: async (content, inputPath) => {
    const { name } = path.parse(inputPath);
    // все частичные файлы (_*.scss) пропускаем
    if (name.startsWith("_")) return;

    let { css:resultCss } = sass.compileString(content, {
      loadPaths: [path.dirname(inputPath)],
      style: "compressed",
    });

    // Возвращаем функцию, которая отдаёт готовый CSS
    return async () => resultCss;
  },


  permalink: (contents, inputPath) => {
    // убрать "src/" и поменять .scss на .css
    let relative = inputPath.startsWith(inputDir + "/")
      ? inputPath.slice(inputDir.length + 1)
      : inputPath;
    return relative.replace(/\.scss$/, ".css");
  },
});


  /* ------------- JS Minify ------------ */
  eleventyConfig.addTemplateFormats("js");
eleventyConfig.addExtension("js", {
  outputFileExtension: "js",


  permalink: (data, inputPath) => {
    // Здесь скорректируйте путь под вашу структуру (обычно "./src/assets/scripts/")
    if (!inputPath.startsWith("./assets/scripts/")) return false;
    // убираем "./" в начале, чтобы получить "assets/scripts/..."
    return inputPath.slice(2);
  },

  compile: async (content, inputPath) => {
    if (!inputPath.startsWith("./assets/scripts/")) return;
    try {
      const m = await Terser.minify(content, {
            mangle: {
              toplevel: true,
              properties: {
                regex: /^_/           // прятать все поля, начинающиеся с _
              }
            },
            compress: {
              passes: 2              // две итерации сжатия
            },
            format: {
              comments: false        // убрать все комментарии
            }
          });
              return async () => m.code ?? content;
    } catch {
      return async () => content;
    }
  }
});
  /* ------------- HTML Minify ------------ */
  eleventyConfig.addTransform("htmlmin", async (content, outputPath) => {
    if (typeof outputPath === "string" && outputPath.endsWith(".html")) {
      try {
        return await htmlmin.minify(content, {
          useShortDoctype: true,
          removeComments: true,
          collapseWhitespace: true,
          conservativeCollapse: true,
          minifyCSS: true,
          minifyJS: true
        });
      } catch { return content; }
    }
    return content;
  });

  /* ------------ Passthrough ------------ */
  [
    "src/assets/images","src/assets/fonts","src/assets/media", "src/assets/scripts",
    "src/assets/css",
    "src/robots.txt","src/site.webmanifest","src/browserconfig.xml",
    "src/favicon.ico","src/apple-touch-icon.png","src/favicon-32x32.png",
    "src/favicon-16x16.png","src/favicon-192x192.png", "src/android-chrome-192x192.png",
    "src/safari-pinned-tab.svg","src/mstile-150x150.png", "src/48c3b517-7a37-497c-aa5e-76363bef87b1.txt",
    "src/maskable_icon.png","src/maskable_icon_x512.png", "src/ew7d7qc6dkbqq2ybv7erfmu21vd135du.txt",
    "src/_redirects","src/_headers","src/netlify.toml","src/CNAME", "src/service-workers.js",
  ].forEach((p) => eleventyConfig.addPassthroughCopy(p));



  eleventyConfig.addTransform("normalizeNfc", (content, outputPath) => {
    if(outputPath && outputPath.endsWith(".html")) {
      // JavaScript-метод String.prototype.normalize
      return content.normalize("NFC");
    }
    return content;
  });

  
  if (isProdBuild) {
    eleventyConfig.on("afterBuild", () => {
      console.log("✅ Сборка завершена. Завершаем процесс вручную.");
      process.exit(0);
    });
  }

  /* ------------- Final Config ----------- */
  return {
    templateFormats: ["md","markdown","html","liquid","njk","scss","js", "json"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    dir: { input: inputDir, includes: includesDir, layouts: layoutsDir, data: dataDir, output: outputDir }
  };
}
