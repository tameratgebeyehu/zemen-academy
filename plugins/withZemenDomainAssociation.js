const {
  AndroidConfig,
  withAndroidManifest,
  withStringsXml,
} = require('@expo/config-plugins');

const RESOURCE_NAME = 'asset_statements';

function withAssetStatementsManifest(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      manifestConfig.modResults,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      RESOURCE_NAME,
      '@string/' + RESOURCE_NAME,
      'resource',
    );
    return manifestConfig;
  });
}

function withAssetStatementsString(config, domain) {
  return withStringsXml(config, (stringsConfig) => {
    const resources = AndroidConfig.Resources.ensureDefaultResourceXML(
      stringsConfig.modResults,
    );
    const strings = resources.resources.string ?? [];
    const value = '[{\\"include\\":\\"https://' + domain + '/.well-known/assetlinks.json\\"}]';
    const item = {
      $: { name: RESOURCE_NAME, translatable: 'false' },
      _: value,
    };
    const existingIndex = strings.findIndex(
      (entry) => entry?.$?.name === RESOURCE_NAME,
    );

    if (existingIndex >= 0) strings[existingIndex] = item;
    else strings.push(item);

    resources.resources.string = strings;
    stringsConfig.modResults = resources;
    return stringsConfig;
  });
}

module.exports = function withZemenDomainAssociation(config, options = {}) {
  const domain = String(options.domain ?? 'zemenacademy.com')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(domain)) {
    throw new Error('withZemenDomainAssociation requires a valid domain name.');
  }

  config = withAssetStatementsManifest(config);
  config = withAssetStatementsString(config, domain);
  return config;
};