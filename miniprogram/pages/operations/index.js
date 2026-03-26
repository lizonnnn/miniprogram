const store = require('../../utils/store');
const operatorProfile = require('../../utils/operator-profile');

const SECTION_TABS = [
  { key: 'stock', label: '出入库' },
  { key: 'equipment', label: '大型设备使用' },
  { key: 'instrument', label: '仪器使用' },
  { key: 'reagent', label: '试剂使用' }
];
const MOVEMENT_TYPES = ['入库', '出库'];
const STATUS_OPTIONS = ['使用中', '已完成', '待开始'];
const STATUS_MAP = {
  '使用中': '使用中',
  '已完成': '已完成',
  '待开始': '待开始',
  'æµ£è·¨æ•¤æ¶“?': '使用中',
  'å®¸æ’ç•¬éŽ´?': '已完成',
  'å¯°å‘¯æ·®éŽ¶?': '待开始'
};
const CATEGORY_SECTION_MAP = {
  '大型设备': 'equipment',
  '仪器': 'instrument',
  '试剂': 'reagent'
};

function getToday() {
  const date = new Date();
  const pad = (value) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getCurrentTime() {
  const date = new Date();
  const pad = (value) => `${value}`.padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function joinDateTime(date, time) {
  if (!date) {
    return '';
  }

  return time ? `${date} ${time}` : date;
}

function calculateDurationText(startDateTime, endDateTime) {
  const start = new Date(startDateTime.replace(/-/g, '/'));
  const end = new Date(endDateTime.replace(/-/g, '/'));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return '';
  }

  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours && remainingMinutes) {
    return `${hours} 小时 ${remainingMinutes} 分钟`;
  }
  if (hours) {
    return `${hours} 小时`;
  }
  return `${remainingMinutes} 分钟`;
}

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

function filterItems(items, keyword, fields) {
  const normalizedKeyword = `${keyword || ''}`.trim().toLowerCase();
  if (!normalizedKeyword) {
    return items.slice();
  }

  return items.filter((item) => fields.some((field) => `${item[field] || ''}`.toLowerCase().includes(normalizedKeyword)));
}

Page({
  data: {
    sectionTabs: SECTION_TABS,
    movementTypes: MOVEMENT_TYPES,
    statusOptions: STATUS_OPTIONS,
    activeSection: 'stock',
    currentOperator: null,
    stockCatalog: [],
    equipmentCatalog: [],
    instrumentCatalog: [],
    reagentCatalog: [],
    filteredStock: [],
    filteredEquipment: [],
    filteredInstrument: [],
    filteredReagent: [],
    equipmentBusyMap: {},
    instrumentBusyMap: {},
    selectedStockId: '',
    selectedEquipmentId: '',
    selectedInstrumentId: '',
    selectedReagentId: '',
    selectedStockCard: null,
    selectedEquipmentCard: null,
    selectedInstrumentCard: null,
    selectedReagentCard: null,
    stockForm: {
      typeIndex: 0,
      quantity: '',
      remark: ''
    },
    equipmentForm: {
      purpose: '',
      startDate: getToday(),
      startTime: getCurrentTime(),
      endDate: getToday(),
      endTime: getCurrentTime(),
      statusIndex: 0,
      remark: ''
    },
    instrumentForm: {
      project: '',
      startDate: getToday(),
      startTime: getCurrentTime(),
      endDate: getToday(),
      endTime: getCurrentTime(),
      statusIndex: 0,
      remark: ''
    },
    reagentForm: {
      amount: '',
      date: getToday(),
      time: getCurrentTime(),
      purpose: '',
      remark: ''
    },
    selectorVisible: false,
    selectorKey: '',
    selectorTitle: '',
    selectorKeyword: '',
    selectorOptions: []
  },

  onLoad(options) {
    this.presetItemId = options.itemId || '';
    this.presetSection = options.section || '';
    this.presetApplied = false;
  },

  onShow() {
    this.syncOperatorProfile();
    this.refresh();
  },

  syncOperatorProfile() {
    this.setData({
      currentOperator: operatorProfile.getCachedOperatorProfile()
    });
  },

  async refresh() {
    try {
      const [catalog, equipmentRecords, labRecords] = await Promise.all([
        store.getInventoryCatalog(),
        store.getEquipmentRecords(),
        store.getLabRecords()
      ]);

      const stockCatalog = Array.isArray(catalog) ? catalog : [];
      const equipmentCatalog = stockCatalog.filter((item) => item.category === '大型设备');
      const instrumentCatalog = stockCatalog.filter((item) => item.category === '仪器');
      const reagentCatalog = stockCatalog.filter((item) => item.category === '试剂');
      const equipmentBusyMap = createBusyMap(equipmentRecords, 'deviceName');
      const instrumentBusyMap = createBusyMap(labRecords.instrumentRecords, 'instrumentName');

      this.setData({
        stockCatalog,
        equipmentCatalog,
        instrumentCatalog,
        reagentCatalog,
        equipmentBusyMap,
        instrumentBusyMap
      });

      this.applyFilters();
      this.applyPresetSelection();
    } catch (error) {
      wx.showToast({
        title: error.message || '加载登记数据失败',
        icon: 'none'
      });
    }
  },

  applyPresetSelection() {
    if (this.presetApplied || !this.presetItemId) {
      return;
    }

    const matchedItem = this.data.stockCatalog.find((item) => item.id === this.presetItemId);
    if (!matchedItem) {
      return;
    }

    const nextSection = this.presetSection || CATEGORY_SECTION_MAP[matchedItem.category] || 'stock';
    const nextState = {
      activeSection: nextSection
    };

    if (nextSection === 'stock') {
      nextState.selectedStockId = matchedItem.id;
    } else if (nextSection === 'equipment') {
      nextState.selectedEquipmentId = matchedItem.id;
    } else if (nextSection === 'instrument') {
      nextState.selectedInstrumentId = matchedItem.id;
    } else if (nextSection === 'reagent') {
      nextState.selectedReagentId = matchedItem.id;
    }

    this.setData(nextState, () => {
      this.applyFilters();
      this.presetApplied = true;
    });
  },

  applyFilters() {
    const filteredStock = filterItems(this.data.stockCatalog, '', ['name', 'spec', 'location', 'category'])
      .map((item) => Object.assign({}, item, {
        selected: item.id === this.data.selectedStockId
      }));

    const filteredEquipment = filterItems(this.data.equipmentCatalog, '', ['name', 'spec', 'location'])
      .map((item) => {
        const busyRecord = this.data.equipmentBusyMap[item.name];
        return Object.assign({}, item, {
          selected: item.id === this.data.selectedEquipmentId,
          disabled: !!busyRecord,
          statusText: busyRecord ? '使用中' : '空闲',
          statusDetail: busyRecord ? `${busyRecord.user || '微信用户'} · ${busyRecord.purpose || '已登记用途'}` : '可直接登记使用'
        });
      });

    const filteredInstrument = filterItems(this.data.instrumentCatalog, '', ['name', 'spec', 'location'])
      .map((item) => {
        const busyRecord = this.data.instrumentBusyMap[item.name];
        return Object.assign({}, item, {
          selected: item.id === this.data.selectedInstrumentId,
          disabled: !!busyRecord,
          statusText: busyRecord ? '使用中' : '空闲',
          statusDetail: busyRecord ? `${busyRecord.user || '微信用户'} · ${busyRecord.project || '已登记项目'}` : '可直接登记使用'
        });
      });

    const filteredReagent = filterItems(this.data.reagentCatalog, '', ['name', 'spec', 'location', 'hazardType'])
      .map((item) => Object.assign({}, item, {
        selected: item.id === this.data.selectedReagentId
      }));

    this.setData({
      filteredStock,
      filteredEquipment,
      filteredInstrument,
      filteredReagent,
      selectedStockCard: this.data.stockCatalog.find((item) => item.id === this.data.selectedStockId) || null,
      selectedEquipmentCard: this.data.equipmentCatalog.find((item) => item.id === this.data.selectedEquipmentId) || null,
      selectedInstrumentCard: this.data.instrumentCatalog.find((item) => item.id === this.data.selectedInstrumentId) || null,
      selectedReagentCard: this.data.reagentCatalog.find((item) => item.id === this.data.selectedReagentId) || null
    }, () => {
      if (this.data.selectorVisible) {
        this.refreshSelectorOptions();
      }
    });
  },

  switchSection(event) {
    this.setData({
      activeSection: event.currentTarget.dataset.section
    });
  },

  noop() {},

  getSelectorTitle(key) {
    const titleMap = {
      stock: '选择出入库物资',
      equipment: '选择大型设备',
      instrument: '选择仪器',
      reagent: '选择试剂'
    };
    return titleMap[key] || '选择物品';
  },

  buildSelectorOptions(key, keyword) {
    let source = [];
    let fields = [];

    if (key === 'stock') {
      source = this.data.filteredStock;
      fields = ['name', 'spec', 'location', 'category'];
    } else if (key === 'equipment') {
      source = this.data.filteredEquipment;
      fields = ['name', 'spec', 'location', 'statusDetail'];
    } else if (key === 'instrument') {
      source = this.data.filteredInstrument;
      fields = ['name', 'spec', 'location', 'statusDetail'];
    } else if (key === 'reagent') {
      source = this.data.filteredReagent;
      fields = ['name', 'spec', 'location', 'hazardType'];
    }

    return filterItems(source, keyword, fields);
  },

  refreshSelectorOptions() {
    this.setData({
      selectorOptions: this.buildSelectorOptions(this.data.selectorKey, this.data.selectorKeyword)
    });
  },

  openSelector(event) {
    const selectorKey = event.currentTarget.dataset.selectorKey;
    this.setData({
      selectorVisible: true,
      selectorKey,
      selectorTitle: this.getSelectorTitle(selectorKey),
      selectorKeyword: '',
      selectorOptions: this.buildSelectorOptions(selectorKey, '')
    });
  },

  closeSelector() {
    this.setData({
      selectorVisible: false,
      selectorKey: '',
      selectorTitle: '',
      selectorKeyword: '',
      selectorOptions: []
    });
  },

  onSelectorKeywordInput(event) {
    this.setData({
      selectorKeyword: event.detail.value
    }, () => this.refreshSelectorOptions());
  },

  selectSelectorOption(event) {
    const selectorKey = this.data.selectorKey;
    const itemId = event.currentTarget.dataset.itemId;
    const disabled = event.currentTarget.dataset.disabled === true || event.currentTarget.dataset.disabled === 'true';
    if (disabled) {
      return;
    }

    const nextState = {
      selectorVisible: false,
      selectorKey: '',
      selectorTitle: '',
      selectorKeyword: '',
      selectorOptions: []
    };

    if (selectorKey === 'stock') {
      nextState.selectedStockId = itemId;
    } else if (selectorKey === 'equipment') {
      nextState.selectedEquipmentId = itemId;
    } else if (selectorKey === 'instrument') {
      nextState.selectedInstrumentId = itemId;
    } else if (selectorKey === 'reagent') {
      nextState.selectedReagentId = itemId;
    }

    this.setData(nextState, () => this.applyFilters());
  },

  onFieldInput(event) {
    const form = event.currentTarget.dataset.form;
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`${form}.${field}`]: event.detail.value
    });
  },

  onNumberInput(event) {
    const form = event.currentTarget.dataset.form;
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`${form}.${field}`]: event.detail.value
    });
  },

  onPickerChange(event) {
    const form = event.currentTarget.dataset.form;
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`${form}.${field}`]: Number(event.detail.value)
    });
  },

  onDateChange(event) {
    const form = event.currentTarget.dataset.form;
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`${form}.${field}`]: event.detail.value
    });
  },

  onTimeChange(event) {
    const form = event.currentTarget.dataset.form;
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`${form}.${field}`]: event.detail.value
    });
  },

  openRecordsPage() {
    wx.switchTab({
      url: '/miniprogram/pages/records/index'
    });
  },

  async ensureCurrentOperator() {
    const currentOperator = await operatorProfile.ensureOperatorProfile();
    this.setData({
      currentOperator
    });
    return currentOperator;
  },

  async submitStock() {
    const selectedItem = this.data.selectedStockCard;
    if (!selectedItem) {
      wx.showToast({ title: '请先选择物资', icon: 'none' });
      return;
    }

    try {
      const currentOperator = await this.ensureCurrentOperator();
      await store.addStockMovement({
        itemId: selectedItem.id,
        type: MOVEMENT_TYPES[this.data.stockForm.typeIndex],
        quantity: this.data.stockForm.quantity,
        operator: currentOperator.nickName,
        operatorUuid: currentOperator.operatorUuid,
        remark: this.data.stockForm.remark,
        date: joinDateTime(getToday(), getCurrentTime()),
        source: 'operations_page'
      });

      wx.showToast({ title: '登记成功', icon: 'success' });
      this.setData({
        stockForm: {
          typeIndex: 0,
          quantity: '',
          remark: ''
        }
      });
      await this.refresh();
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    }
  },

  async submitEquipment() {
    const selectedItem = this.data.selectedEquipmentCard;
    const form = this.data.equipmentForm;
    if (!selectedItem) {
      wx.showToast({ title: '请先选择大型设备', icon: 'none' });
      return;
    }

    if (!form.purpose || !form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      wx.showToast({ title: '请填写完整的设备使用信息', icon: 'none' });
      return;
    }

    try {
      const currentOperator = await this.ensureCurrentOperator();
      await store.addEquipmentUsage({
        deviceName: selectedItem.name,
        user: currentOperator.nickName,
        operatorUuid: currentOperator.operatorUuid,
        purpose: form.purpose,
        startTime: joinDateTime(form.startDate, form.startTime),
        endTime: joinDateTime(form.endDate, form.endTime),
        status: STATUS_OPTIONS[form.statusIndex],
        remark: form.remark
      });

      wx.showToast({ title: '设备记录已保存', icon: 'success' });
      this.setData({
        equipmentForm: {
          purpose: '',
          startDate: getToday(),
          startTime: getCurrentTime(),
          endDate: getToday(),
          endTime: getCurrentTime(),
          statusIndex: 0,
          remark: ''
        }
      });
      await this.refresh();
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    }
  },

  async submitInstrument() {
    const selectedItem = this.data.selectedInstrumentCard;
    const form = this.data.instrumentForm;
    if (!selectedItem) {
      wx.showToast({ title: '请先选择仪器', icon: 'none' });
      return;
    }

    if (!form.project || !form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      wx.showToast({ title: '请填写完整的仪器使用信息', icon: 'none' });
      return;
    }

    if (this.data.instrumentBusyMap[selectedItem.name]) {
      wx.showToast({ title: '该仪器当前正在使用中', icon: 'none' });
      return;
    }

    try {
      const currentOperator = await this.ensureCurrentOperator();
      const startTime = joinDateTime(form.startDate, form.startTime);
      const endTime = joinDateTime(form.endDate, form.endTime);
      await store.addInstrumentUsage({
        instrumentName: selectedItem.name,
        user: currentOperator.nickName,
        operatorUuid: currentOperator.operatorUuid,
        project: form.project,
        date: form.startDate,
        startTime,
        endTime,
        status: STATUS_OPTIONS[form.statusIndex],
        duration: calculateDurationText(startTime, endTime),
        remark: form.remark
      });

      wx.showToast({ title: '仪器记录已保存', icon: 'success' });
      this.setData({
        instrumentForm: {
          project: '',
          startDate: getToday(),
          startTime: getCurrentTime(),
          endDate: getToday(),
          endTime: getCurrentTime(),
          statusIndex: 0,
          remark: ''
        }
      });
      await this.refresh();
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    }
  },

  async submitReagent() {
    const selectedItem = this.data.selectedReagentCard;
    const form = this.data.reagentForm;
    if (!selectedItem) {
      wx.showToast({ title: '请先选择试剂', icon: 'none' });
      return;
    }

    if (!form.amount || !form.date || !form.time || !form.purpose) {
      wx.showToast({ title: '请填写完整的试剂使用信息', icon: 'none' });
      return;
    }

    try {
      const currentOperator = await this.ensureCurrentOperator();
      await store.submitReagentUsage({
        itemId: selectedItem.id,
        reagentName: selectedItem.name,
        amount: form.amount,
        unit: selectedItem.unit,
        user: currentOperator.nickName,
        operatorUuid: currentOperator.operatorUuid,
        date: form.date,
        time: form.time,
        usedAt: joinDateTime(form.date, form.time),
        purpose: form.purpose,
        isHazardous: selectedItem.isHazardous,
        hazardType: selectedItem.hazardType,
        remark: form.remark
      });

      wx.showToast({ title: '试剂记录已保存', icon: 'success' });
      this.setData({
        reagentForm: {
          amount: '',
          date: getToday(),
          time: getCurrentTime(),
          purpose: '',
          remark: ''
        }
      });
      await this.refresh();
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    }
  }
});
