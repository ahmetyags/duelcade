module.exports = ({ config }) => {
  const productionBuild = process.env.EAS_BUILD_PROFILE === 'production';

  return {
    ...config,
    plugins: (config.plugins ?? []).map((plugin) => {
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
