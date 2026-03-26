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

  async refresh() {
    try {
      const result = await store.getLabRecords();
      this.setData({
        instrumentCatalog: result.instrumentCatalog,
        reagentCatalog: result.reagentCatalog,
        instrumentRecords: result.instrumentRecords,
        reagentRecords: result.reagentRecords
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载记录失败',
        icon: 'none'
      });
    }
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

  async submitInstrument() {
    const catalog = this.data.instrumentCatalog[this.data.instrumentForm.instrumentIndex];
    const form = this.data.instrumentForm;
    if (!catalog || !form.user || !form.project || !form.date || !form.duration) {
      wx.showToast({ title: 'ç’‡å³°ï½žéæ¬ç•¬éç¿ åŽé£ã„¨î†‡è¤°?', icon: 'none' });
      return;
    }

    try {
      await store.addInstrumentUsage({
        instrumentName: catalog.name,
        user: form.user,
        project: form.project,
        date: form.date,
        duration: form.duration,
        remark: form.remark
      });

      wx.showToast({ title: 'æµ î„æ«’ç’æ¿ç¶å®¸è¹­ç¹šç€›?', icon: 'success' });
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
      await this.refresh();
    } catch (error) {
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    }
  },

  async submitReagent() {
    const catalog = this.data.reagentCatalog[this.data.reagentForm.reagentIndex];
    const form = this.data.reagentForm;
    if (!catalog || !form.amount || !form.user || !form.date || !form.purpose) {
      wx.showToast({ title: 'ç’‡å³°ï½žéæ¬ç•¬éç£‹ç˜¯é“å‚î†‡è¤°?', icon: 'none' });
      return;
    }

    try {
      await store.addReagentUsage({
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

      wx.showToast({ title: 'ç’‡æ›žå¢ç’æ¿ç¶å®¸è¹­ç¹šç€›?', icon: 'success' });
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
      await this.refresh();
    } catch (error) {
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    }
  }
});
