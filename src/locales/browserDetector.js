export default {
  name: 'browser',

  lookup() {
    // options -> are passed in options
    const userLang = navigator.language || navigator.userLanguage;
    return userLang;
  },

  cacheUserLanguage() {
    // options -> are passed in options
    // lng -> current language, will be called after init and on changeLanguage
    // store it
  },
};
