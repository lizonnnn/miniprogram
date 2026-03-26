const store = require('../../utils/store');

const FILTERS = ['所有物品', '大型设备', '仪器', '试剂'];
const STATUS_MAP = {
  '使用中': '使用中',
  '已完成': '已完成',
  '待开始': '待开始',
  'æµ£è·¨æ•¤æ¶“?': '使用中',
  'å®¸æ’ç•¬éŽ´?': '已完成',
  'å¯°å‘¯æ·®éŽ¶?': '待开始'
};

function normalizeUsageStatus(value) {
  return STATUS_MAP[value] || '已完成';
}

function createBusyMap(records, nameField) {
  return (records || []).reduce((result, record) => {
    const name = record && record[nameField] ? record[nameField] : '';
    if (!name) {
      return result;
    }

    if (normalizeUsageStatus(record.status) === '使用中' && !result[name]) {
      result[name] = record;
    }
    return result;
  }, {});
}

function includesKeyword(item, keyword) {
  const normalizedKeyword = `${keyword || ''}`.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  return [
    item.name,
    item.spec,
    item.location,
    item.category,
    item.hazardType,
    item.statusText,
    item.statusDetail
  ].some((field) => `${field || ''}`.toLowerCase().includes(normalizedKeyword));
}

Page({
  data: {
    filters: FILTERS,
    activeFilter: '所有物品',
    keywordInput: '',
    keyword: '',
    items: [],
    visibleItems: []
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    try {
      const [inventory, equipmentRecords, labRecords] = await Promise.all([
        store.getInventory('全部'),
        store.getEquipmentRecords(),
        store.getLabRecords()
      ]);

      const equipmentBusyMap = createBusyMap(equipmentRecords, 'deviceName');
      const instrumentBusyMap = createBusyMap(labRecords.instrumentRecords, 'instrumentName');

      const items = (inventory.items || []).map((item) => {
        const equipmentBusyRecord = equipmentBusyMap[item.name];
        const instrumentBusyRecord = instrumentBusyMap[item.name];
        const busyRecord = equipmentBusyRecord || instrumentBusyRecord || null;
        const isBusy = !!busyRecord;
        const isLowStock = Number(item.stock || 0) <= Number(item.minStock || 0);
        const actionSection = item.category === '大型设备'
          ? 'equipment'
          : (item.category === '仪器' ? 'instrument' : 'reagent');

        return Object.assign({}, item, {
          statusText: isBusy ? '使用中' : (item.category === '试剂' ? (isLowStock ? '库存偏低' : '可用') : '空闲'),
          statusTone: isBusy || isLowStock ? 'badge-warning' : 'badge-primary',
          statusDetail: isBusy
            ? `${busyRecord.user || '微信用户'} · ${busyRecord.purpose || busyRecord.project || '已登记用途'}`
            : (item.category === '试剂' ? `当前库存 ${item.stock}${item.unit}` : '当前可借用'),
          usageActionText: item.category === '试剂' ? '去使用' : '去借用',
          actionSection
        });
      });

      this.setData({
        items
      });
      this.applyFilters();
    } catch (error) {
      wx.showToast({
        title: error.message || '加载库存失败',
        icon: 'none'
      });
    }
  },

  applyFilters() {
    const visibleItems = this.data.items.filter((item) => {
      if (this.data.activeFilter !== '所有物品' && item.category !== this.data.activeFilter) {
        return false;
      }
      return includesKeyword(item, this.data.keyword);
    });

    this.setData({
      visibleItems
    });
  },

  switchFilter(event) {
    this.setData({
      activeFilter: event.currentTarget.dataset.value
    }, () => this.applyFilters());
  },

  onKeywordInput(event) {
    this.setData({
      keywordInput: event.detail.value
    });
  },

  onSearchSubmit() {
    this.setData({
      keyword: this.data.keywordInput
    }, () => this.applyFilters());
  },

  openRecordsPage() {
    wx.switchTab({
      url: '/miniprogram/pages/records/index'
    });
  }
});
