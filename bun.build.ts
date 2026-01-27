import * as fs from 'fs';

// Stub plugin for optional dev dependencies
const optionalDepsPlugin = {
  name: 'optional-deps',
  setup(build: Parameters<Parameters<typeof Bun.build>[0]['plugins'][number]['setup']>[0]) {
    // Stub react-devtools-core (only used when DEV=true)
    build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
      path: 'react-devtools-core',
      namespace: 'optional-stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'optional-stub' }, () => ({
      contents: `export default { initialize: () => {}, connectToDevTools: () => {} };`,
      loader: 'js',
    }));
  },
};

// Text loader plugin for embedding files
const textLoaderPlugin = {
  name: 'text-loader',
  setup(build: Parameters<Parameters<typeof Bun.build>[0]['plugins'][number]['setup']>[0]) {
    build.onLoad({ filter: /\.(md|txt)$/ }, async args => {
      const text = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(text)};`,
        loader: 'js',
      };
    });
    // Handle .ts files in llm-compacted as text (use platform-agnostic pattern)
    build.onLoad({ filter: /llm-compacted[/\\].*\.ts$/ }, async args => {
      const text = await Bun.file(args.path).text();
      return {
        contents: `export default ${JSON.stringify(text)};`,
        loader: 'js',
      };
    });
  },
};

await Bun.build({
  entrypoints: ['./src/cli/index.ts'],
  outdir: './dist/cli',
  target: 'node',
  format: 'esm',
  minify: true,
  naming: '[dir]/[name].mjs',
  external: ['fsevents', '@aws-cdk/toolkit-lib'],
  plugins: [optionalDepsPlugin, textLoaderPlugin],
});

// Make executable
fs.chmodSync('./dist/cli/index.mjs', '755');

console.log('CLI build complete: dist/cli/index.mjs');
