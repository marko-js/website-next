import path from "path";
import type { Plugin } from "@rollup/browser";
import * as compiler from "@marko/compiler";
import * as translator from "marko/translator";
import runtimeDOM from "marko/dom?raw";
import runtimeHTML from "marko/html?raw";
import runtimeDebugDOM from "marko/debug/dom?raw";
import runtimeDebugHTML from "marko/debug/html?raw";

import type { Workspace } from "../workspace";

declare module "../workspace" {
  interface Workspace {
    markoCompiled?: {
      dom?: Record<string, { code: string; map: any }>;
      html?: Record<string, { code: string; map: any }>;
    };
  }
}

const cache = new Map();
const knownTemplatesForWS = new WeakMap<Workspace, string[]>();
const runtimeModules: Record<string, string> = {
  "marko/dom": runtimeDOM,
  "marko/html": runtimeHTML,
  "marko/debug/dom": runtimeDebugDOM,
  "marko/debug/html": runtimeDebugHTML,
};

// Shim currently needed because @marko/compiler uses `lasso-package-root`.
(globalThis as any).process = {
  browser: true,
  env: {
    NODE_ENV: "production",
  },
  cwd() {
    return "/";
  },
};

export interface MarkoPluginOptions {
  ws: Workspace;
  browser: boolean;
}
export function markoPlugin({ ws, browser }: MarkoPluginOptions): Plugin {
  const { fs, optimize } = ws;
  let optimizeKnownTemplates = knownTemplatesForWS.get(ws);
  if (!optimizeKnownTemplates) {
    cache.clear();
    compiler.taglib.clearCaches();
    optimizeKnownTemplates = [];
    for (const file in fs.files) {
      if (isMarkoFile(file)) {
        optimizeKnownTemplates.push(file);
      }
    }
    knownTemplatesForWS.set(ws, optimizeKnownTemplates);
  }

  const output = browser ? "dom" : "html";
  const baseConfig: compiler.Config = {
    cache,
    output,
    optimize,
    translator,
    stripTypes: true,
    sourceMaps: true,
    fileSystem: fs as any,
    optimizeKnownTemplates,
    resolveVirtualDependency(from, { virtualPath, code, map }) {
      const resolved = path.join(from, "..", virtualPath);
      fs.files[resolved] = code;
      if (map) {
        fs.files[resolved + ".map"] = JSON.stringify(map);
      }
      return virtualPath;
    },
  };
  const hydrateConfig: compiler.Config = { ...baseConfig, output: "hydrate" };
  const compiled = ((ws.markoCompiled ??= {})[output] ??= {});

  for (const file of optimizeKnownTemplates) {
    const { code, map } = compiler.compileSync(
      fs.files[file],
      file,
      baseConfig,
    );
    compiled[file] = { code, map };
  }

  return {
    name: "marko",
    resolveId(id, importer) {
      const tagName = importer && /^<([^>]+)>$/.exec(id)?.[1];
      if (tagName) {
        const tagDef = compiler.taglib
          .buildLookup(importer.slice(0, importer.lastIndexOf("/")))
          .getTag(tagName);
        return tagDef && (tagDef.template || tagDef.renderer);
      }
      if (id in runtimeModules) {
        return id;
      }
    },
    load(id) {
      return runtimeModules[id];
    },
    transform(code, id) {
      const suffix = /\?.*$/.exec(id)?.[0];
      if (suffix) {
        id = id.slice(0, -suffix.length);
      }

      if (isMarkoFile(id)) {
        if (suffix === "?hydrate") {
          const compiled = compiler.compileSync(code, id, hydrateConfig);
          return {
            code: compiled.code,
            map: compiled.map,
          };
        }

        return compiled[id];
      }
    },
  };
}

function isMarkoFile(file: string) {
  return file.endsWith(".marko");
}
