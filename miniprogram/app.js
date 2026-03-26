const store = require('./utils/store');

App({
  onLaunch() {
    store.ensureSeedData().catch((error) => {
      console.error('云端数据初始化失败', error);
    });
  }
});
