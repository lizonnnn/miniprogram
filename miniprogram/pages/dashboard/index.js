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
  },

  openInventory() {
    wx.switchTab({
      url: '/miniprogram/pages/inventory/index'
    });
  },

  openOperations() {
    wx.switchTab({
      url: '/miniprogram/pages/operations/index'
    });
  },

  openRecords() {
    wx.switchTab({
      url: '/miniprogram/pages/records/index'
    });
  }
});
