const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup/index.tsx',
    content: './src/content/content.ts',
    background: './src/background/background.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      // You might need loaders for images/fonts if you bundle them
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    // This plugin is not needed if popup.html is in src/popup and copied by CopyWebpackPlugin
    // new HtmlWebpackPlugin({
    //   template: './src/popup/popup.html', // Path to your popup.html
    //   filename: 'popup.html', // Output filename in dist
    //   chunks: ['popup'], // Only include the popup bundle
    // }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/popup/popup.html', to: 'popup.html' }, // Copies popup.html to dist/popup.html
        { from: 'src/content/content.css', to: 'content.css', noErrorOnMissing: true }, // Copies content.css if it exists
        { from: 'icons', to: 'icons', noErrorOnMissing: true }, // Copies icons folder
        // Add manifest.json if it's not in root or if you want it processed/copied to dist
        // For this setup, manifest.json is usually in the root and packed manually or by a script
      ],
    }),
  ],
  devtool: 'cheap-module-source-map', // <-- This is the only change you need
};
