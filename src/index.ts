import { resolve, extname } from "path";
import { outputFileSync, pathExistsSync, readFileSync } from "fs-extra";
import type { IPluginContext } from "@tarojs/service";
import {
  createCli,
  getPrjConfig,
  getPkgConfig,
  formatJson,
  createCompJson,
  removeComments,
  TPL_COMP_CONTENT,
  TPL_COMP_WXML,
  WX_CALENDAR_PKG_NAME,
  PKG_LATEST_VERSION,
  PkgJson,
  copyDir,
  delDir,
} from "./utils";

import "colors";

const TPL_RLT_DIR = ".lspriv";
const PKG_JSON = "package.json";

const VITE_PLUGIN_NAME = "@lspriv/plugin-taro:vite";
const WEBPACK_PLUGIN_NAME = "@lspriv/plugin-taro:webpack";

const MNP_API_TYPINGS = "miniprogram-api-typings";

export type CalendarPluginOptions = {
  cli?: string; // 命令行工具
  plugins?: string[]; // 使用插件
  resolveMnpApiTypings?: boolean;
};

const createDependencies = (pkg: PkgJson, plugins: string[]) => {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return [WX_CALENDAR_PKG_NAME, ...plugins].reduce((dependencies, name) => {
    return { ...dependencies, [name]: deps[name] || PKG_LATEST_VERSION };
  }, {} as Record<string, string>);
};

const handleTplBundleChunks = (bundle: any, tplDir: string) => {
  const keys = Object.keys(bundle);
  let i = keys.length;
  while (i--) {
    const key = keys[i];
    const filename = bundle[key].fileName || key;
    if (filename.startsWith(tplDir)) {
      delete bundle[key];
    }
  }
};

const improveTypeDeclare = (
  wxCalJsonPathsAddon: (json: Record<string, any>) => void
) => {
  const tsconfigPath = resolve(process.cwd(), "tsconfig.json");
  if (pathExistsSync(tsconfigPath)) {
    const content = removeComments(readFileSync(tsconfigPath, "utf8"));
    const tsconfig = JSON.parse(content);
    wxCalJsonPathsAddon(tsconfig);
    outputFileSync(tsconfigPath, formatJson(tsconfig), "utf8");
  } else {
    const jsconfigPath = resolve(process.cwd(), "jsconfig.json");
    let jsconfig = {};
    if (pathExistsSync(jsconfigPath)) {
      const content = removeComments(readFileSync(jsconfigPath, "utf8"));
      jsconfig = JSON.parse(content);
    }
    wxCalJsonPathsAddon(jsconfig);
    outputFileSync(jsconfigPath, formatJson(jsconfig), "utf8");
  }
};

const checkMnpBuilding = (output: string): boolean => {
  const mnp_calendar_path = resolve(
    output,
    "miniprogram_npm",
    WX_CALENDAR_PKG_NAME
  );
  return pathExistsSync(mnp_calendar_path);
};

const createLog =
  (tag: string) =>
  (spinner: any, message: string, type: string = "succeed") => {
    const color =
      type === "succeed" ? "green" : type === "start" ? "blue" : "red";
    spinner[type](`[${tag}] `.grey + message[color]);
  };

/**
 * 编译过程扩展
 */
export default (ctx: IPluginContext, opts: CalendarPluginOptions = {}) => {
  const ora = require("ora");
  const spinner = ora();

  const log = createLog(require(`../${PKG_JSON}`).name);

  if (process.env.TARO_ENV !== "weapp") {
    log(spinner, "日历组件目前仅支持微信小程序", "fail");
    return;
  }

  opts.resolveMnpApiTypings = opts.resolveMnpApiTypings ?? true;
  const output = ctx.paths.outputPath;
  const { NPM_DIR, NODE_MODULES } = ctx.helper;

  const TPL_NPM_DIR = `${NPM_DIR}/${TPL_RLT_DIR}`;
  const PKG_TPL_DIR = `${NODE_MODULES}/${TPL_RLT_DIR}`;

  const cli = createCli(output);

  const tplPkgDir = resolve(process.cwd(), PKG_TPL_DIR, WX_CALENDAR_PKG_NAME);
  const compEntryPath = resolve(tplPkgDir, "index.js");
  const compWxmlPath = resolve(tplPkgDir, "index.wxml");
  const compJsonPath = resolve(tplPkgDir, "index.json");

  const tplRegexp = new RegExp(
    `("|'|\`)([^"'\`/]*/)*(${NODE_MODULES}|${NPM_DIR})/${TPL_RLT_DIR}/${WX_CALENDAR_PKG_NAME}(/[^"'\`]*)?("|'|\`)?`
  );

  ctx.modifyRunnerOpts(({ opts }) => {
    opts.alias = opts.alias || {};
    opts.alias[WX_CALENDAR_PKG_NAME] = tplPkgDir;
  });

  ctx.onBuildStart(() => {
    try {
      improveTypeDeclare((json) => {
        const compilerOptions = json.compilerOptions || {};
        compilerOptions.paths = compilerOptions.paths || {};
        compilerOptions.paths[`${WX_CALENDAR_PKG_NAME}/*`] = [
          `./${NODE_MODULES}/${WX_CALENDAR_PKG_NAME}/dist/*`,
        ];
        json.compilerOptions = compilerOptions;
        if (
          opts.resolveMnpApiTypings &&
          !json.files?.find((item) => item.includes(MNP_API_TYPINGS))
        ) {
          const files = json.files || [];
          files.push(`${NODE_MODULES}/${MNP_API_TYPINGS}/index.d.ts`);
          json.files = files;
        }
      });
      outputFileSync(compJsonPath, createCompJson(), "utf8");
      outputFileSync(compEntryPath, TPL_COMP_CONTENT, "utf8");
      outputFileSync(compWxmlPath, TPL_COMP_WXML, "utf8");
    } catch (e) {
      console.log(e);
    }
  });

  ctx.modifyViteConfig(({ viteConfig }) => {
    const build = viteConfig.build || {};
    build.rollupOptions = {
      ...build.rollupOptions,
      external: [...(build.rollupOptions?.external || []), /^@lspriv\//],
    };
    viteConfig.build = build;
    viteConfig.plugins.push({
      name: VITE_PLUGIN_NAME,
      generateBundle: (_, bundle) => {
        handleTplBundleChunks(bundle, TPL_NPM_DIR);
      },
    });
  });

  ctx.modifyWebpackChain(({ chain }) => {
    const WX_CAL_LIB = `${WX_CALENDAR_PKG_NAME}/lib`;
    chain.externals({
      [WX_CAL_LIB]: `commonjs ${WX_CAL_LIB}`,
      ...opts.plugins?.reduce((modules, module) => {
        modules[module] = `commonjs ${module}`;
        return modules;
      }, {}),
    });
    chain.plugin(WEBPACK_PLUGIN_NAME).use(
      class {
        apply(compiler) {
          compiler.hooks.thisCompilation.tap(
            WEBPACK_PLUGIN_NAME,
            (compilation) => {
              compilation.hooks.processAssets.tap(
                {
                  name: WEBPACK_PLUGIN_NAME,
                  stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
                },
                (assets) => {
                  handleTplBundleChunks(assets, TPL_NPM_DIR);
                }
              );
            }
          );
        }
      }
    );
  });

  ctx.modifyBuildAssets(({ assets }) => {
    const keys = Object.keys(assets);
    keys.forEach((key) => {
      const ext = extname(key);
      if (ext === ".json" || ext === ".js") {
        const content = assets[key].source();
        if (!content) return;
        if (tplRegexp.test(content)) {
          assets[key] = {
            source: () =>
              content.replace(
                new RegExp(tplRegexp, "g"),
                `$1${WX_CALENDAR_PKG_NAME}$1`
              ),
          };
        }
      }
    });

    const pkgConfig = getPkgConfig();
    const dependencies = createDependencies(pkgConfig, opts.plugins || []);

    if (assets[PKG_JSON]) {
      const content = assets[PKG_JSON].source();
      const pkgJson = content ? JSON.parse(content) : ({} as PkgJson);
      pkgJson.dependencies = { ...pkgJson.dependencies, ...dependencies };
      assets[PKG_JSON] = {
        source: () => formatJson(pkgJson),
      };
    } else {
      const prjConfig = getPrjConfig();
      const pkgJson = {} as PkgJson;
      pkgJson.name = prjConfig.projectname || pkgConfig.name;
      pkgJson.version = pkgConfig.version;
      pkgJson.author = pkgConfig.author || "";
      pkgJson.description = prjConfig.description || pkgConfig.description;
      pkgJson.dependencies = dependencies;
      ctx.writeFileToDist({ filePath: PKG_JSON, content: formatJson(pkgJson) });
    }
  });

  ctx.onBuildFinish(async () => {
    if (checkMnpBuilding(output)) return;
    try {
      log(spinner, "building npm", "start");

      const plugins = [
        ...new Set([WX_CALENDAR_PKG_NAME, ...(opts.plugins || [])]),
      ];

      const cwd = process.cwd();

      for (const plugin of plugins) {
        const src = resolve(cwd, `node_modules/${plugin}`);
        const dest = resolve(cwd, `dist/node_modules/${plugin}`);
        await copyDir(src, dest);
      }

      cli("build-npm --compile-type miniprogram", {
        stdio: "ignore",
        withPrj: true,
        cli: opts.cli,
      });

      await delDir(resolve(cwd, `dist/node_modules`));
      log(spinner, "building npm completed", "succeed");
    } catch (e) {
      log(spinner, e.message, "fail");
    }
  });
};

export * from "./element";
