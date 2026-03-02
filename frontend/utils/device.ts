export const isSmartTV = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const tvKeywords = [
    'smart-tv',
    'smarttv',
    'googletv',
    'crkey', // Chromecast
    'tizen', // Samsung
    'webos', // LG
    'netcast', // LG
    'viera', // Panasonic
    ' Bravia', // Sony
    'aftt', // Amazon Fire TV
    'roku',
    'dtv',
    'appletv',
  ];

  return tvKeywords.some(keyword => userAgent.includes(keyword));
};
