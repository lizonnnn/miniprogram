const store = require('../../utils/store');

Page({
  data: {
    activeTab: 'instrument',
    instrumentCatalog: [],
    reagentCatalog: [],
    instrumentRecords: [],
    reagentRecords: [],
    instrumentForm: {
      instrumentIndex: 0,
      user: '',
      project: '',
      date: '',
      duration: '',
      remark: ''
    },
    reagentForm: {
      reagentIndex: 0,
      amount: '',
      user: '',
      date: '',
      purpose: '',
      remark: ''
    }
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const result = store.getLabRecords();
    this.setData({
      instrumentCatalog: result.instrumentCatalog,
      reagentCatalog: result.reagentCatalog,
      instrumentRecords: result.instrumentRecords,
      reagentRecords: result.reagentRecords
    });
  },

  switchTab(event) {
    this.setData({
      activeTab: event.currentTarget.dataset.tab
    });
  },

  onPickerChange(event) {
    const field = event.currentTarget.dataset.field;
    const formName = event.currentTarget.dataset.form;
    this.setData({
      [`${formName}.${field}`]: Number(event.detail.value)
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    const formName = event.currentTarget.dataset.form;
    this.setData({
      [`${formName}.${field}`]: event.detail.value
    });
  },

  submitInstrument() {
    const catalog = this.data.instrumentCatalog[this.data.instrumentForm.instrumentIndex];
    const form = this.data.instrumentForm;
    if (!catalog || !form.user || !form.project || !form.date || !form.duration) {
      wx.showToast({ title: '请填写完整仪器记录', icon: 'none' });
      return;
    }

    store.addInstrumentUsage({
      instrumentName: catalog.name,
      user: form.user,
      project: form.project,
      date: form.date,
      duration: form.duration,
      remark: form.remark
    });

    wx.showToast({ title: '仪器记录已保存', icon: 'success' });
    this.setData({
      instrumentForm: {
        instrumentIndex: 0,
        user: '',
        project: '',
        date: '',
        duration: '',
        remark: ''
      }
    });
    this.refresh();
  },

  submitReagent() {
    const catalog = this.data.reagentCatalog[this.data.reagentForm.reagentIndex];
    const form = this.data.reagentForm;
    if (!catalog || !form.amount || !form.user || !form.date || !form.purpose) {
      wx.showToast({ title: '请填写完整试剂记录', icon: 'none' });
      return;
    }

    store.addReagentUsage({
      reagentName: catalog.name,
      amount: form.amount,
      unit: catalog.unit,
      user: form.user,
      date: form.date,
      purpose: form.purpose,
      isHazardous: catalog.isHazardous,
      hazardType: catalog.hazardType,
      remark: form.remark
    });

    wx.showToast({ title: '试剂记录已保存', icon: 'success' });
    this.setData({
      reagentForm: {
        reagentIndex: 0,
        amount: '',
        user: '',
        date: '',
        purpose: '',
        remark: ''
      }
    });
    this.refresh();
  }
});
