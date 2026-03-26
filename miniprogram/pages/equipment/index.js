const store = require('../../utils/store');

const STATUS_OPTIONS = ['æµ£è·¨æ•¤æ¶“?', 'å®¸æ’ç•¬éŽ´?', 'å¯°å‘¯æ·®éŽ¶?'];

Page({
  data: {
    statusOptions: STATUS_OPTIONS,
    records: [],
    form: {
      deviceName: '',
      user: '',
      purpose: '',
      startTime: '',
      endTime: '',
      statusIndex: 0,
      remark: ''
    }
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    try {
      const records = await store.getEquipmentRecords();
      this.setData({
        records
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载记录失败',
        icon: 'none'
      });
    }
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  onStatusChange(event) {
    this.setData({
      'form.statusIndex': Number(event.detail.value)
    });
  },

  async submitForm() {
    const form = this.data.form;
    if (!form.deviceName || !form.user || !form.purpose || !form.startTime || !form.endTime) {
      wx.showToast({ title: 'ç’‡å³°ï½žéæ¬ç•¬éç¿ ä¿ŠéŽ­?', icon: 'none' });
      return;
    }

    try {
      await store.addEquipmentUsage({
        deviceName: form.deviceName,
        user: form.user,
        purpose: form.purpose,
        startTime: form.startTime,
        endTime: form.endTime,
        status: this.data.statusOptions[form.statusIndex],
        remark: form.remark
      });

      wx.showToast({ title: 'å®¸å‰æŸŠæ¾§ç‚¶î†‡è¤°?', icon: 'success' });
      this.setData({
        form: {
          deviceName: '',
          user: '',
          purpose: '',
          startTime: '',
          endTime: '',
          statusIndex: 0,
          remark: ''
        }
      });
      await this.refresh();
    } catch (error) {
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    }
  }
});
