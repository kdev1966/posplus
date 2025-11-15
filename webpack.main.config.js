const path = require('path');

module.exports = {
  target: 'electron-main',
  entry: {
    main: './src/main/index.ts',
    preload: './src/preload/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
    'usb': 'commonjs usb',
    'node-hid': 'commonjs node-hid',
    'escpos': 'commonjs escpos',
  },
};
