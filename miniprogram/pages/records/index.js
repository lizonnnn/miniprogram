const store = require('../../utils/store');

const RECORD_FILTERS = ['全部', '出入库', '设备使用', '仪器使用', '试剂使用'];
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

function sortByDateDesc(a, b) {
  return new Date(`${b.sortValue}`.replace(/-/g, '/')) - new Date(`${a.sortValue}`.replace(/-/g, '/'));
}

function includesKeyword(fields, keyword) {
  const normalizedKeyword = `${keyword || ''}`.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  return fields.some((field) => `${field || ''}`.toLowerCase().includes(normalizedKeyword));
}

Page({
  data: {
    filters: RECORD_FILTERS,
    activeFilter: '全部',
    keyword: '',
    records: [],
    visibleRecords: []
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

      const stockRecords = (inventory.movements || []).map((item) => ({
        id: `stock-${item.id}`,
        recordType: '出入库',
        title: item.itemName,
        badgeText: `${item.type} ${item.quantity}${item.unit}`,
        badgeTone: item.type === '出库' ? 'badge-warning' : 'badge-primary',
        detailPrimary: `操作人：${item.operator || '微信用户'}`,
        detailSecondary: item.remark || '无备注',
        timeText: item.date,
        sortValue: item.date
      }));

      const equipmentUsageRecords = (equipmentRecords || []).map((item) => ({
        id: `equipment-${item.id}`,
        recordType: '设备使用',
        title: item.deviceName,
        badgeText: normalizeUsageStatus(item.status),
        badgeTone: normalizeUsageStatus(item.status) === '使用中' ? 'badge-danger' : 'badge-primary',
        detailPrimary: `${item.user || '微信用户'} · ${item.purpose || '未填写用途'}`,
        detailSecondary: `${item.startTime || ''}${item.endTime ? ` - ${item.endTime}` : ''}`,
        timeText: item.startTime || item.endTime || '',
        sortValue: item.startTime || item.endTime || ''
      }));

      const instrumentUsageRecords = (labRecords.instrumentRecords || []).map((item) => ({
        id: `instrument-${item.id}`,
        recordType: '仪器使用',
        title: item.instrumentName,
        badgeText: normalizeUsageStatus(item.status || '已完成'),
        badgeTone: normalizeUsageStatus(item.status || '已完成') === '使用中' ? 'badge-danger' : 'badge-primary',
        detailPrimary: `${item.user || '微信用户'} · ${item.project || '未填写项目'}`,
        detailSecondary: item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : (item.duration || '未填写时长'),
        timeText: item.startTime || item.date || '',
        sortValue: item.startTime || item.date || ''
      }));

      const reagentUsageRecords = (labRecords.reagentRecords || []).map((item) => ({
        id: `reagent-${item.id}`,
        recordType: '试剂使用',
        title: item.reagentName,
        badgeText: `${item.amount}${item.unit}`,
        badgeTone: item.isHazardous ? 'badge-danger' : 'badge-primary',
        detailPrimary: `${item.user || '微信用户'} · ${item.purpose || '未填写用途'}`,
        detailSecondary: item.remark || (item.hazardType || '无备注'),
        timeText: item.usedAt || item.date || '',
        sortValue: item.usedAt || item.date || ''
      }));

      const records = stockRecords
        .concat(equipmentUsageRecords, instrumentUsageRecords, reagentUsageRecords)
        .sort(sortByDateDesc);

      this.setData({
        records
      });
      this.applyFilters();
    } catch (error) {
      wx.showToast({
        title: error.message || '加载记录失败',
        icon: 'none'
      });
    }
  },

  switchFilter(event) {
    this.setData({
      activeFilter: event.currentTarget.dataset.value
    }, () => this.applyFilters());
  },

  onKeywordInput(event) {
    this.setData({
      keyword: event.detail.value
    }, () => this.applyFilters());
  },

  applyFilters() {
    const visibleRecords = this.data.records.filter((item) => {
      if (this.data.activeFilter !== '全部' && item.recordType !== this.data.activeFilter) {
        return false;
      }

      return includesKeyword([
        item.title,
        item.recordType,
        item.badgeText,
        item.detailPrimary,
        item.detailSecondary,
        item.timeText
      ], this.data.keyword);
    });

    this.setData({
      visibleRecords
    });
  }
});
