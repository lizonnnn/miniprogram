const STORAGE_KEY = 'lab-stock-local-state-v1';

const seedData = {
  stockItems: [
    {
      id: 'item-1',
      name: '液氮罐',
      category: '大型设备',
      spec: 'YDG-500',
      unit: '台',
      stock: 2,
      minStock: 1,
      location: '大型设备区 A-01',
      isHazardous: false,
      hazardType: ''
    },
    {
      id: 'item-2',
      name: '高效液相色谱仪',
      category: '仪器',
      spec: 'HPLC-1260',
      unit: '台',
      stock: 3,
      minStock: 1,
      location: '仪器区 B-02',
      isHazardous: false,
      hazardType: ''
    },
    {
      id: 'item-3',
      name: '无水乙醇',
      category: '试剂',
      spec: '500mL/瓶',
      unit: '瓶',
      stock: 18,
      minStock: 10,
      location: '试剂柜 C-03',
      isHazardous: true,
      hazardType: '易燃液体'
    },
    {
      id: 'item-4',
      name: '75%乙醇',
      category: '试剂',
      spec: '100mL/瓶',
      unit: '瓶',
      stock: 6,
      minStock: 4,
      location: '试剂柜 C-01',
      isHazardous: true,
      hazardType: '易燃液体'
    },
    {
      id: 'item-5',
      name: '生理盐水',
      category: '试剂',
      spec: '1L/袋',
      unit: '袋',
      stock: 4,
      minStock: 6,
      location: '试剂柜 C-05',
      isHazardous: false,
      hazardType: ''
    }
  ],
  stockMovements: [
    {
      id: 'move-1',
      itemId: 'item-3',
      itemName: '无水乙醇',
      type: '出库',
      quantity: 2,
      unit: '瓶',
      operator: '王小兰',
      date: '2026-03-09 15:20',
      remark: '色谱实验使用'
    },
    {
      id: 'move-2',
      itemId: 'item-5',
      itemName: '生理盐水',
      type: '入库',
      quantity: 5,
      unit: '袋',
      operator: '张库管',
      date: '2026-03-08 11:10',
      remark: '新到货补充'
    }
  ],
  equipmentUsageRecords: [
    {
      id: 'eq-1',
      deviceName: '液氮罐',
      user: '赵明',
      purpose: '样品临时存储',
      startTime: '2026-03-10 08:30',
      endTime: '2026-03-10 10:00',
      status: '已完成',
      remark: '使用后已检查密封'
    },
    {
      id: 'eq-2',
      deviceName: '离心机',
      user: '林涛',
      purpose: '细胞样本分离',
      startTime: '2026-03-10 13:00',
      endTime: '2026-03-10 15:30',
      status: '使用中',
      remark: '运行正常'
    }
  ],
  instrumentUsageRecords: [
    {
      id: 'inst-1',
      instrumentName: '高效液相色谱仪',
      user: '陈越',
      project: '溶剂纯度检测',
      date: '2026-03-10',
      duration: '2 小时',
      remark: '已完成清洗'
    }
  ],
  reagentUsageRecords: [
    {
      id: 'rea-1',
      reagentName: '无水乙醇',
      amount: 1,
      unit: '瓶',
      user: '陈越',
      date: '2026-03-10',
      purpose: '色谱实验',
      isHazardous: true,
      hazardType: '易燃液体',
      remark: '已登记使用人'
    },
    {
      id: 'rea-2',
      reagentName: '75%乙醇',
      amount: 1,
      unit: '瓶',
      user: '李楠',
      date: '2026-03-09',
      purpose: '台面消杀',
      isHazardous: true,
      hazardType: '易燃液体',
      remark: '用于实验前消毒'
    }
  ]
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function getNow() {
  const date = new Date();
  const pad = (value) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sortByDateDesc(a, b) {
  return new Date(`${b.date}`.replace(/-/g, '/')) - new Date(`${a.date}`.replace(/-/g, '/'));
}

function sortByRangeDesc(a, b) {
  return new Date(`${b.startTime}`.replace(/-/g, '/')) - new Date(`${a.startTime}`.replace(/-/g, '/'));
}

function loadState() {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (stored && stored.stockItems) {
    return clone(stored);
  }

  const initial = clone(seedData);
  wx.setStorageSync(STORAGE_KEY, initial);
  return initial;
}

function saveState(state) {
  wx.setStorageSync(STORAGE_KEY, clone(state));
}

function ensureSeedData() {
  loadState();
  return Promise.resolve({ initialized: true });
}

function getStockItemById(state, itemId) {
  const item = state.stockItems.find((current) => current.id === itemId);
  if (!item) {
    throw new Error('未找到对应物资');
  }

  return item;
}

function getDashboardMetrics() {
  const state = loadState();
  const lowStockCount = state.stockItems.filter((item) => Number(item.stock || 0) <= Number(item.minStock || 0)).length;
  const hazardousCount = state.stockItems.filter((item) => item.isHazardous).length;
  const activeEquipmentCount = state.equipmentUsageRecords.filter((item) => item.status === '使用中').length;

  return Promise.resolve({
    totalSku: state.stockItems.length,
    lowStockCount,
    hazardousCount,
    activeEquipmentCount,
    recentMovements: state.stockMovements.slice().sort(sortByDateDesc).slice(0, 4),
    equipmentUsageRecords: state.equipmentUsageRecords.slice().sort(sortByRangeDesc).slice(0, 3),
    reagentUsageRecords: state.reagentUsageRecords.slice().sort(sortByDateDesc).slice(0, 3)
  });
}

function getInventory(filter) {
  const state = loadState();
  const items = state.stockItems
    .filter((item) => !filter || filter === '全部' || item.category === filter)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  return Promise.resolve({
    items,
    movements: state.stockMovements.slice().sort(sortByDateDesc),
    stockOptions: state.stockItems.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      category: item.category
    }))
  });
}

function getInventoryCatalog() {
  const state = loadState();
  return Promise.resolve(
    state.stockItems
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  );
}

function createStockItem(payload) {
  const state = loadState();
  if (!payload || !payload.name || !payload.category || !payload.unit) {
    return Promise.reject(new Error('新建物资至少需要名称、分类和单位'));
  }

  const item = {
    id: createId('item'),
    name: `${payload.name}`.trim(),
    category: `${payload.category}`.trim(),
    spec: `${payload.spec || '待补充规格'}`.trim(),
    unit: `${payload.unit}`.trim(),
    stock: Number(payload.stock || 0),
    minStock: Number(payload.minStock || 0),
    location: `${payload.location || '待分配库位'}`.trim(),
    isHazardous: !!payload.isHazardous,
    hazardType: payload.isHazardous ? `${payload.hazardType || '待补充风险说明'}`.trim() : ''
  };

  if (state.stockItems.some((current) => current.name === item.name)) {
    return Promise.reject(new Error('已存在同名物资，请先确认是否需要直接选择现有物资。'));
  }

  state.stockItems.push(item);
  saveState(state);
  return Promise.resolve(clone(item));
}

function addStockMovement(payload) {
  const state = loadState();
  const item = getStockItemById(state, payload.itemId);
  const type = payload.type;
  const quantity = Number(payload.quantity || 0);

  if (type !== '入库' && type !== '出库') {
    return Promise.reject(new Error('库存操作类型只能是入库或出库'));
  }

  if (!quantity || quantity <= 0) {
    return Promise.reject(new Error('数量必须大于 0'));
  }

  if (type === '出库' && Number(item.stock || 0) < quantity) {
    return Promise.reject(new Error('库存不足，无法出库'));
  }

  item.stock = type === '入库' ? Number(item.stock || 0) + quantity : Number(item.stock || 0) - quantity;

  const movement = {
    id: createId('move'),
    itemId: item.id,
    itemName: item.name,
    type,
    quantity,
    unit: item.unit,
    operator: payload.operator || '未填写',
    date: payload.date || getNow(),
    remark: payload.remark || ''
  };

  state.stockMovements.unshift(movement);
  saveState(state);
  return Promise.resolve(clone(movement));
}

async function applyDraftMovements(draftLines, options) {
  if (!Array.isArray(draftLines) || !draftLines.length) {
    throw new Error('没有可执行的出入库草稿');
  }

  const operator = options && options.operator ? options.operator : '未填写';
  const date = options && options.date ? options.date : getNow();

  for (let index = 0; index < draftLines.length; index += 1) {
    const draft = draftLines[index];
    if (!draft || !draft.itemId) {
      throw new Error('存在未确认物资，无法执行');
    }

    await addStockMovement({
      itemId: draft.itemId,
      type: draft.type,
      quantity: draft.quantity,
      operator,
      date,
      remark: draft.remark || draft.text || ''
    });
  }

  return { success: true };
}

function applyStocktakeAdjustments(adjustments, options) {
  const state = loadState();
  if (!Array.isArray(adjustments) || !adjustments.length) {
    return Promise.reject(new Error('没有可执行的盘点调整'));
  }

  const operator = options && options.operator ? options.operator : '未填写';
  const date = options && options.date ? options.date : getNow();

  adjustments.forEach((adjustment, index) => {
    const item = getStockItemById(state, adjustment.itemId);
    const countedQuantity = Number(adjustment.countedQuantity);

    if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
      throw new Error('盘点数量必须是大于等于 0 的数字');
    }

    const previousQuantity = Number(item.stock || 0);
    const difference = countedQuantity - previousQuantity;
    item.stock = countedQuantity;

    state.stockMovements.unshift({
      id: createId(`stocktake-${index}`),
      itemId: item.id,
      itemName: item.name,
      type: '盘点',
      quantity: countedQuantity,
      unit: item.unit,
      operator,
      date,
      remark: adjustment.remark || `盘点后由 ${previousQuantity}${item.unit} 调整为 ${countedQuantity}${item.unit}，差异 ${difference >= 0 ? '+' : ''}${difference}${item.unit}`
    });
  });

  saveState(state);
  return Promise.resolve({ success: true });
}

function applyThresholdUpdates(adjustments, options) {
  const state = loadState();
  if (!Array.isArray(adjustments) || !adjustments.length) {
    return Promise.reject(new Error('没有可执行的预警值调整'));
  }

  const operator = options && options.operator ? options.operator : '未填写';
  const date = options && options.date ? options.date : getNow();

  adjustments.forEach((adjustment, index) => {
    const item = getStockItemById(state, adjustment.itemId);
    const minStock = Number(adjustment.minStock);

    if (!Number.isFinite(minStock) || minStock < 0) {
      throw new Error('预警值必须是大于等于 0 的数字');
    }

    const previousMinStock = Number(item.minStock || 0);
    item.minStock = minStock;

    state.stockMovements.unshift({
      id: createId(`threshold-${index}`),
      itemId: item.id,
      itemName: item.name,
      type: '预警值调整',
      quantity: minStock,
      unit: item.unit,
      operator,
      date,
      remark: adjustment.remark || `预警值由 ${previousMinStock}${item.unit} 调整为 ${minStock}${item.unit}`
    });
  });

  saveState(state);
  return Promise.resolve({ success: true });
}

function getEquipmentRecords() {
  const state = loadState();
  return Promise.resolve(state.equipmentUsageRecords.slice().sort(sortByRangeDesc));
}

function getLabRecords() {
  const state = loadState();
  return Promise.resolve({
    instrumentRecords: state.instrumentUsageRecords.slice().sort(sortByDateDesc),
    reagentRecords: state.reagentUsageRecords.slice().sort(sortByDateDesc),
    reagentCatalog: state.stockItems
      .filter((item) => item.category === '试剂')
      .map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        isHazardous: !!item.isHazardous,
        hazardType: item.hazardType || ''
      })),
    instrumentCatalog: state.stockItems
      .filter((item) => item.category === '仪器')
      .map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit
      }))
  });
}

function addEquipmentUsage(payload) {
  const state = loadState();
  const record = {
    id: createId('eq'),
    deviceName: payload.deviceName,
    user: payload.user,
    purpose: payload.purpose,
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: payload.status,
    remark: payload.remark || ''
  };

  state.equipmentUsageRecords.unshift(record);
  saveState(state);
  return Promise.resolve(clone(record));
}

function addInstrumentUsage(payload) {
  const state = loadState();
  const record = {
    id: createId('inst'),
    instrumentName: payload.instrumentName,
    user: payload.user,
    project: payload.project,
    date: payload.date,
    duration: payload.duration,
    remark: payload.remark || ''
  };

  state.instrumentUsageRecords.unshift(record);
  saveState(state);
  return Promise.resolve(clone(record));
}

function addReagentUsage(payload) {
  const state = loadState();
  const record = {
    id: createId('rea'),
    reagentName: payload.reagentName,
    amount: Number(payload.amount || 0),
    unit: payload.unit,
    user: payload.user,
    date: payload.date,
    purpose: payload.purpose,
    isHazardous: !!payload.isHazardous,
    hazardType: payload.hazardType || '',
    remark: payload.remark || ''
  };

  state.reagentUsageRecords.unshift(record);
  saveState(state);
  return Promise.resolve(clone(record));
}

module.exports = {
  ensureSeedData,
  getDashboardMetrics,
  getInventory,
  getInventoryCatalog,
  createStockItem,
  addStockMovement,
  applyDraftMovements,
  applyStocktakeAdjustments,
  applyThresholdUpdates,
  getEquipmentRecords,
  getLabRecords,
  addEquipmentUsage,
  addInstrumentUsage,
  addReagentUsage
};
