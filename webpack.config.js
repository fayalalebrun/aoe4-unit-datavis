const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: "javascript/auto",
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },

  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      util: require.resolve("util/"),
      buffer: require.resolve("buffer/"),
      stream: require.resolve("stream-browserify"),
      fs: require.resolve("browserify-fs"),
      crypto: require.resolve("crypto-browserify"),
    },
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new HtmlWebpackPlugin({
      hash: true,
      title: "InfoVis",
      metaDesc: "InfoVis Project",
      template: "./src/index.html",
      filename: "index.html",
      inject: "body",
    }),
    new CopyPlugin({
      patterns: [{ from: "./src/assets/fires.sqlite.gz", to: "." }],
    }),
  ],
};
