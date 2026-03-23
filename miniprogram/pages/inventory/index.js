const store = require('../../utils/store');

const FILTERS = ['全部', '大型设备', '仪器', '试剂'];
const MOVEMENT_TYPES = ['入库', '出库'];

Page({
  data: {
    filters: FILTERS,
    activeFilter: '全部',
    movementTypes: MOVEMENT_TYPES,
    form: {
      itemIndex: 0,
      typeIndex: 0,
      quantity: '',
      operator: '',
      remark: ''
    },
    stockOptions: [],
    items: [],
    movements: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const result = store.getInventory(this.data.activeFilter);
    this.setData({
      items: result.items,
      movements: result.movements,
      stockOptions: result.stockOptions
    });
  },

  switchFilter(event) {
    const { value } = event.currentTarget.dataset;
    this.setData({ activeFilter: value }, () => this.refresh());
  },

  onPickerChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: Number(event.detail.value)
    });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  submitForm() {
    const selectedItem = this.data.stockOptions[this.data.form.itemIndex];
    if (!selectedItem) {
      wx.showToast({ title: '请先选择物资', icon: 'none' });
      return;
    }

    try {
      store.addStockMovement({
        itemId: selectedItem.id,
        type: this.data.movementTypes[this.data.form.typeIndex],
        quantity: this.data.form.quantity,
        operator: this.data.form.operator,
        remark: this.data.form.remark,
        date: this.getNow()
      });

      wx.showToast({ title: '登记成功', icon: 'success' });
      this.setData({
        form: {
          itemIndex: 0,
          typeIndex: 0,
          quantity: '',
          operator: '',
          remark: ''
        }
      });
      this.refresh();
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  getNow() {
    const date = new Date();
    const pad = (value) => `${value}`.padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
});
