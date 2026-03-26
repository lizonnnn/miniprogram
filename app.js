const store = require('./miniprogram/utils/store');

const CLOUD_ENV_ID = 'cloud1-6gor9uqobed844dd';

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
    } else {
      console.warn('当前基础库不支持云开发，请升级微信基础库版本。');
    }

    store.ensureSeedData().catch((error) => {
      const message = error && error.message ? error.message : '云端数据初始化失败';
      console.error('云端数据初始化失败', error);
      wx.showModal({
        title: '云数据库初始化失败',
        content: message,
        showCancel: false
      });
      throw error;
    });
  }
});
