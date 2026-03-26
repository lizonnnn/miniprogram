const store = require('../../utils/store');

Page({
  data: {
    metrics: null
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    try {
      const metrics = await store.getDashboardMetrics();
      this.setData({
        metrics
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载数据失败',
        icon: 'none'
      });
    }
  }
});
