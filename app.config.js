module.exports = ({ config }) => {
  const productionBuild = process.env.EAS_BUILD_PROFILE === 'production';
  const plugins = [...(config.plugins ?? [])];
  if (!plugins.some((plugin) => (
    plugin === '@sentry/react-native'
    || (Array.isArray(plugin) && plugin[0] === '@sentry/react-native')
  ))) {
    plugins.push('@sentry/react-native');
  }

  return {
    ...config,
    plugins: plugins.map((plugin) => {
      if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') {
        return plugin;
      }

      return [
        plugin[0],
        {
          ...plugin[1],
          android: {
            ...plugin[1]?.android,
            usesCleartextTraffic: !productionBuild,
          },
        },
      ];
    }),
  };
};
