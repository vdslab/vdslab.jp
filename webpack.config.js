const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WorkboxPlugin = require('workbox-webpack-plugin')

const options = {
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'src', 'app')
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['env', 'react']
            }
          }
        ]
      }
    ]
  },
  entry: {
    bundle: './src/app'
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: '[name].js'
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: 'node_modules/bulma/css/bulma.css',
        to: 'vendor'
      }
    ]),
    new WorkboxPlugin.GenerateSW({
      swDest: 'sw.js',
      // globDirectory: './public',
      // globPatterns: [
      //   '*.{html,css,js,json,txt}'
      // ],
      // globIgnores: [
      //   '_redirects',
      //   'bundle.js',
      //   'sw.js'
      // ],
      navigateFallback: '/index.html'
    })
  ],
  devServer: {
    contentBase: path.join(__dirname, 'public'),
    historyApiFallback: true,
    port: 8081,
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:9000',
        pathRewrite: {
          '^/.netlify/functions': ''
        }
      }
    }
  }
}

if (process.env.NODE_ENV === 'production') {
} else {
  Object.assign(options, {
    devtool: 'inline-source-map'
  })
}

module.exports = options
