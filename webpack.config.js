module.exports = {
  //...

  module: {
    rules: [
      {
        test: /\.twig$/,
        use: {
          loader: 'twig-loader',
          options: {
              // See options section below
          },
        }
      }
    ]
  },

 resolve: {
    fallback: {
      fs: false,
      path: require.resolve("path-browserify")
    }
  },

  entry: {
        main:'./src/index.js',
        form:'./src/index.js',
    },
    output: {
       filename: '[name].js'
    },
};