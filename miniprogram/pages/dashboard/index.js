const store = require('../../utils/store');

Page({
  data: {
    metrics: null
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    this.setData({
      metrics: store.getDashboardMetrics()
    });
  }
});
