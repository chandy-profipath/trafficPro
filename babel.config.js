module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-transform-destructuring', { loose: true, useBuiltIns: true }],
      '@babel/plugin-proposal-export-namespace-from', // For web support
      'react-native-reanimated/plugin'
    ]
  };
};
