import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'byeolil',
  brand: {
    primaryColor: '#F2B72A',
  },
  permissions: [],
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
    withTitle: true,
    theme: 'light',
  },
  webView: {
    bounces: true,
    pullToRefreshEnabled: false,
    allowsBackForwardNavigationGestures: true,
  },
  webBundleDir: 'miniapp-dist',
});
