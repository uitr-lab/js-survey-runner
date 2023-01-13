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
  }
};