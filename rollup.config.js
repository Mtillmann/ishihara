import terser from '@rollup/plugin-terser'
import { nodeResolve } from '@rollup/plugin-node-resolve'

const config = {
  input: 'dist/index.js',
  output: {
    file: 'dist/index.bundle.iife.js',
    format: 'iife',
    name: 'ishihara'
  }
}

const configs = [structuredClone(config), structuredClone(config),
  {
    input: 'dist/index.js',
    output: {
      file: 'dist/index.bundle.js',
      format: 'esm'
    },
    plugins: [nodeResolve()]
  },
  {
    input: 'dist/index.js',
    output: {
      file: 'dist/index.bundle.min.js',
      format: 'esm'
    },
    plugins: [nodeResolve(), terser()]
  }]

configs[0].plugins = [nodeResolve()]

configs[1].output.file = 'dist/index.bundle.iife.min.js'
configs[1].plugins = [nodeResolve(), terser()]

export default configs
