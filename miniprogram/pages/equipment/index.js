const store = require('../../utils/store');

const STATUS_OPTIONS = ['使用中', '已完成', '待维护'];

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

  refresh() {
    this.setData({
      records: store.getEquipmentRecords()
    });
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

  submitForm() {
    const form = this.data.form;
    if (!form.deviceName || !form.user || !form.purpose || !form.startTime || !form.endTime) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    store.addEquipmentUsage({
      deviceName: form.deviceName,
      user: form.user,
      purpose: form.purpose,
      startTime: form.startTime,
      endTime: form.endTime,
      status: this.data.statusOptions[form.statusIndex],
      remark: form.remark
    });

    wx.showToast({ title: '已新增记录', icon: 'success' });
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
    this.refresh();
  }
});
