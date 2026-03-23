const store = require('./miniprogram/utils/store');

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV,
        traceUser: true
      });
    } else {
      console.warn('当前基础库不支持云开发，请升级微信基础库版本。');
    }

    store.ensureSeedData().catch((error) => {
      console.error('云端数据初始化失败', error);
    });
  }
});
