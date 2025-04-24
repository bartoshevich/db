
import autoprefixer from "autoprefixer";
import cssnano       from "cssnano";

export default {
  plugins: [
    autoprefixer({
      overrideBrowserslist: [
        "last 2 versions",      // последние 2 версии всех основных браузеров
        "not dead",             // исключить устаревшие браузеры
        "not < 0.5%",           // исключить редкие
        "Firefox ESR"           // поддержка Long Term версии Firefox
      ],
      grid: "autoplace",        // поддержка CSS Grid (IE/старые браузеры)
      flexbox: "no-2009"        // исключить устаревшую 2009 реализацию
    }),
    cssnano({ preset: "default" })
  ]
};
