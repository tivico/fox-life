// Keep asset review separate from the existing autonomous character and interaction loop.
if (new URLSearchParams(location.search).get('preview') === 'fox-v02') {
  void import('./FoxV02Review');
} else if (new URLSearchParams(location.search).get('preview') === 'fox') {
  void import('./FoxAssetPreview');
} else {
  void import('./main');
}
