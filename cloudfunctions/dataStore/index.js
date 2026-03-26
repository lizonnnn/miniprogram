const cloud = require('wx-server-sdk');

const CLOUD_ENV_ID = 'cloud1-6gor9uqobed844dd';
const CLOUD_COLLECTIONS = {
  stockItems: 'lab_stock_items',
  stockMovements: 'lab_stock_movements',
  inventoryRecords: 'lab_inventory_records',
  equipmentUsageRecords: 'lab_equipment_usage_records',
  instrumentUsageRecords: 'lab_instrument_usage_records',
  reagentUsageRecords: 'lab_reagent_usage_records'
};
const FETCH_LIMIT = 100;
const STATUS_OPTIONS = ['使用中', '已完成', '待开始'];
const STATUS_MAP = {
  '使用中': '使用中',
  '已完成': '已完成',
  '待开始': '待开始',
  'æµ£è·¨æ•¤æ¶“?': '使用中',
  'å®¸æ’ç•¬éŽ´?': '已完成',
  'å¯°å‘¯æ·®éŽ¶?': '待开始'
};

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
      operatorUuid: 'seed-user-wang',
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
      operatorUuid: 'seed-user-zhang',
      date: '2026-03-08 11:10',
      remark: '新到货补充'
    }
  ],
  inventoryRecords: [
    {
      id: 'ledger-1',
      movementId: 'move-1',
      itemId: 'item-3',
      itemName: '无水乙醇',
      actionType: '出库',
      quantity: 2,
      unit: '瓶',
      operator: '王小兰',
      operatorUuid: 'seed-user-wang',
      date: '2026-03-09 15:20',
      remark: '色谱实验使用',
      source: 'seed',
      beforeStock: null,
      afterStock: null
    },
    {
      id: 'ledger-2',
      movementId: 'move-2',
      itemId: 'item-5',
      itemName: '生理盐水',
      actionType: '入库',
      quantity: 5,
      unit: '袋',
      operator: '张库管',
      operatorUuid: 'seed-user-zhang',
      date: '2026-03-08 11:10',
      remark: '新到货补充',
      source: 'seed',
      beforeStock: null,
      afterStock: null
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
      startTime: '2026-03-10 09:00',
      endTime: '2026-03-10 11:00',
      status: '已完成',
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
      time: '10:30',
      usedAt: '2026-03-10 10:30',
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
      time: '14:00',
      usedAt: '2026-03-09 14:00',
      purpose: '台面消杀',
      isHazardous: true,
      hazardType: '易燃液体',
      remark: '用于实验前消毒'
    }
  ]
};

cloud.init({
  env: CLOUD_ENV_ID
});

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

function normalizeUsageStatus(value) {
  return STATUS_MAP[value] || '已完成';
}

function normalizeEquipmentRecord(record) {
  return Object.assign({}, record, {
    status: normalizeUsageStatus(record.status)
  });
}

function normalizeInstrumentRecord(record) {
  const startTime = record.startTime || (record.date ? `${record.date} 09:00` : '');
  const endTime = record.endTime || '';
  return Object.assign({}, record, {
    status: normalizeUsageStatus(record.status || '已完成'),
    startTime,
    endTime
  });
}

function normalizeReagentRecord(record) {
  const time = record.time || (record.usedAt && record.usedAt.includes(' ') ? record.usedAt.split(' ')[1] : '');
  return Object.assign({}, record, {
    time,
    usedAt: record.usedAt || (record.date && time ? `${record.date} ${time}` : record.date || '')
  });
}

function getDatabase() {
  return cloud.database({
    env: CLOUD_ENV_ID
  });
}

function getCollection(name) {
  return getDatabase().collection(name);
}

function normalizeDocument(document) {
  if (!document) {
    return null;
  }

  const nextDocument = Object.assign({}, document);
  delete nextDocument._openid;
  return Object.assign(nextDocument, {
    id: document.id || document._id
  });
}

async function fetchCollectionDocuments(collectionName, options) {
  const collection = getCollection(collectionName);
  const orderField = options && options.orderField ? options.orderField : null;
  const orderDirection = options && options.orderDirection ? options.orderDirection : 'asc';
  const records = [];
  let skip = 0;

  while (true) {
    let query = collection;
    if (orderField) {
      query = query.orderBy(orderField, orderDirection);
    }

    const result = await query.skip(skip).limit(FETCH_LIMIT).get();
    const list = Array.isArray(result.data) ? result.data : [];
    records.push(...list.map(normalizeDocument));

    if (list.length < FETCH_LIMIT) {
      break;
    }

    skip += list.length;
  }

  return records;
}

async function saveDocument(collectionName, document) {
  await getCollection(collectionName)
    .doc(document.id)
    .set({
      data: clone(document)
    });
}

async function saveDocuments(collectionName, documents) {
  await Promise.all(documents.map((document) => saveDocument(collectionName, document)));
}

async function getCloudState() {
  const [
    stockItems,
    stockMovements,
    inventoryRecords,
    equipmentUsageRecords,
    instrumentUsageRecords,
    reagentUsageRecords
  ] = await Promise.all([
    fetchCollectionDocuments(CLOUD_COLLECTIONS.stockItems),
    fetchCollectionDocuments(CLOUD_COLLECTIONS.stockMovements, { orderField: 'date', orderDirection: 'desc' }),
    fetchCollectionDocuments(CLOUD_COLLECTIONS.inventoryRecords, { orderField: 'date', orderDirection: 'desc' }),
    fetchCollectionDocuments(CLOUD_COLLECTIONS.equipmentUsageRecords, { orderField: 'startTime', orderDirection: 'desc' }),
    fetchCollectionDocuments(CLOUD_COLLECTIONS.instrumentUsageRecords, { orderField: 'date', orderDirection: 'desc' }),
    fetchCollectionDocuments(CLOUD_COLLECTIONS.reagentUsageRecords, { orderField: 'date', orderDirection: 'desc' })
  ]);

  return {
    stockItems: stockItems.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    stockMovements: stockMovements.slice().sort(sortByDateDesc),
    inventoryRecords: inventoryRecords.slice().sort(sortByDateDesc),
    equipmentUsageRecords: equipmentUsageRecords.map(normalizeEquipmentRecord).sort(sortByRangeDesc),
    instrumentUsageRecords: instrumentUsageRecords.map(normalizeInstrumentRecord).sort(sortByDateDesc),
    reagentUsageRecords: reagentUsageRecords.map(normalizeReagentRecord).sort(sortByDateDesc)
  };
}

async function getStockItemDocument(itemId) {
  try {
    const result = await getCollection(CLOUD_COLLECTIONS.stockItems).doc(itemId).get();
    const item = normalizeDocument(result.data);
    if (!item) {
      throw new Error('未找到对应物资');
    }

    return item;
  } catch (error) {
    throw new Error(error && error.message ? error.message : '未找到对应物资');
  }
}

function createInventoryRecord(payload) {
  return {
    id: createId('ledger'),
    movementId: payload.movementId || '',
    itemId: payload.itemId,
    itemName: payload.itemName,
    actionType: payload.actionType,
    quantity: Number(payload.quantity || 0),
    unit: payload.unit,
    operator: payload.operator || '未填写',
    operatorUuid: payload.operatorUuid || '',
    date: payload.date || getNow(),
    remark: payload.remark || '',
    source: payload.source || 'manual_entry',
    beforeStock: payload.beforeStock === null || payload.beforeStock === undefined ? null : Number(payload.beforeStock),
    afterStock: payload.afterStock === null || payload.afterStock === undefined ? null : Number(payload.afterStock)
  };
}

async function ensureSeedData() {
  const stockItems = await getCollection(CLOUD_COLLECTIONS.stockItems).limit(1).get();
  const hasInventoryData = Array.isArray(stockItems.data) && stockItems.data.length > 0;

  if (!hasInventoryData) {
    await Promise.all([
      saveDocuments(CLOUD_COLLECTIONS.stockItems, seedData.stockItems),
      saveDocuments(CLOUD_COLLECTIONS.stockMovements, seedData.stockMovements),
      saveDocuments(CLOUD_COLLECTIONS.inventoryRecords, seedData.inventoryRecords),
      saveDocuments(CLOUD_COLLECTIONS.equipmentUsageRecords, seedData.equipmentUsageRecords),
      saveDocuments(CLOUD_COLLECTIONS.instrumentUsageRecords, seedData.instrumentUsageRecords),
      saveDocuments(CLOUD_COLLECTIONS.reagentUsageRecords, seedData.reagentUsageRecords)
    ]);
  }

  return { initialized: true };
}

async function getDashboardMetrics() {
  const state = await getCloudState();
  const lowStockCount = state.stockItems.filter((item) => Number(item.stock || 0) <= Number(item.minStock || 0)).length;
  const hazardousCount = state.stockItems.filter((item) => item.isHazardous).length;
  const activeEquipmentCount = state.equipmentUsageRecords.filter((item) => item.status === '使用中').length;

  return {
    totalSku: state.stockItems.length,
    lowStockCount,
    hazardousCount,
    activeEquipmentCount,
    recentMovements: state.stockMovements.slice(0, 4),
    equipmentUsageRecords: state.equipmentUsageRecords.slice(0, 3),
    reagentUsageRecords: state.reagentUsageRecords.slice(0, 3)
  };
}

async function getInventory(payload) {
  const state = await getCloudState();
  const filter = payload && payload.filter ? payload.filter : '';
  const items = state.stockItems
    .filter((item) => !filter || filter === '全部' || item.category === filter)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  return {
    items,
    movements: state.stockMovements,
    stockOptions: state.stockItems.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      category: item.category
    }))
  };
}

async function getInventoryCatalog() {
  const state = await getCloudState();
  return state.stockItems.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

async function getInventoryRecordLedger() {
  const state = await getCloudState();
  return state.inventoryRecords.slice().sort(sortByDateDesc);
}

async function createStockItem(payload) {
  if (!payload || !payload.name || !payload.category || !payload.unit) {
    throw new Error('新建物资至少需要名称、分类和单位');
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

  const duplicated = await getCollection(CLOUD_COLLECTIONS.stockItems)
    .where({
      name: item.name
    })
    .limit(1)
    .get();

  if (Array.isArray(duplicated.data) && duplicated.data.length) {
    throw new Error('已存在同名物资，请先确认是否需要直接选择现有物资。');
  }

  await saveDocument(CLOUD_COLLECTIONS.stockItems, item);
  return clone(item);
}

async function addStockMovement(payload) {
  const item = await getStockItemDocument(payload.itemId);
  const type = payload.type;
  const quantity = Number(payload.quantity || 0);
  const beforeStock = Number(item.stock || 0);

  if (type !== '入库' && type !== '出库') {
    throw new Error('库存操作类型只能是入库或出库');
  }

  if (!quantity || quantity <= 0) {
    throw new Error('数量必须大于 0');
  }

  if (type === '出库' && beforeStock < quantity) {
    throw new Error('库存不足，无法出库');
  }

  const nextStock = type === '入库' ? beforeStock + quantity : beforeStock - quantity;
  const movement = {
    id: createId('move'),
    itemId: item.id,
    itemName: item.name,
    type,
    quantity,
    unit: item.unit,
    operator: payload.operator || '未填写',
    operatorUuid: payload.operatorUuid || '',
    date: payload.date || getNow(),
    remark: payload.remark || ''
  };
  const inventoryRecord = createInventoryRecord({
    movementId: movement.id,
    itemId: movement.itemId,
    itemName: movement.itemName,
    actionType: movement.type,
    quantity: movement.quantity,
    unit: movement.unit,
    operator: movement.operator,
    operatorUuid: movement.operatorUuid,
    date: movement.date,
    remark: movement.remark,
    source: payload.source || 'inventory_page',
    beforeStock,
    afterStock: nextStock
  });

  await Promise.all([
    getCollection(CLOUD_COLLECTIONS.stockItems)
      .doc(item.id)
      .update({
        data: {
          stock: nextStock
        }
      }),
    saveDocument(CLOUD_COLLECTIONS.stockMovements, movement),
    saveDocument(CLOUD_COLLECTIONS.inventoryRecords, inventoryRecord)
  ]);

  return clone(movement);
}

async function applyDraftMovements(payload) {
  const draftLines = payload && Array.isArray(payload.draftLines) ? payload.draftLines : [];
  const options = payload && payload.options ? payload.options : {};

  if (!draftLines.length) {
    throw new Error('没有可执行的出入库草稿');
  }

  const operator = options.operator || '未填写';
  const operatorUuid = options.operatorUuid || '';
  const date = options.date || getNow();

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
      operatorUuid,
      date,
      remark: draft.remark || draft.text || '',
      source: 'ai_assistant'
    });
  }

  return { success: true };
}

async function applyStocktakeAdjustments(payload) {
  const adjustments = payload && Array.isArray(payload.adjustments) ? payload.adjustments : [];
  const options = payload && payload.options ? payload.options : {};

  if (!adjustments.length) {
    throw new Error('没有可执行的盘点调整');
  }

  const operator = options.operator || '未填写';
  const operatorUuid = options.operatorUuid || '';
  const date = options.date || getNow();

  for (let index = 0; index < adjustments.length; index += 1) {
    const adjustment = adjustments[index];
    const item = await getStockItemDocument(adjustment.itemId);
    const countedQuantity = Number(adjustment.countedQuantity);

    if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
      throw new Error('盘点数量必须是大于等于 0 的数字');
    }

    const previousQuantity = Number(item.stock || 0);
    const difference = countedQuantity - previousQuantity;
    const movement = {
      id: createId(`stocktake-${index}`),
      itemId: item.id,
      itemName: item.name,
      type: '盘点',
      quantity: countedQuantity,
      unit: item.unit,
      operator,
      operatorUuid,
      date,
      remark: adjustment.remark || `盘点后由 ${previousQuantity}${item.unit} 调整为 ${countedQuantity}${item.unit}，差异 ${difference >= 0 ? '+' : ''}${difference}${item.unit}`
    };

    await Promise.all([
      getCollection(CLOUD_COLLECTIONS.stockItems)
        .doc(item.id)
        .update({
          data: {
            stock: countedQuantity
          }
        }),
      saveDocument(CLOUD_COLLECTIONS.stockMovements, movement)
    ]);
  }

  return { success: true };
}

async function applyThresholdUpdates(payload) {
  const adjustments = payload && Array.isArray(payload.adjustments) ? payload.adjustments : [];
  const options = payload && payload.options ? payload.options : {};

  if (!adjustments.length) {
    throw new Error('没有可执行的预警值调整');
  }

  const operator = options.operator || '未填写';
  const operatorUuid = options.operatorUuid || '';
  const date = options.date || getNow();

  for (let index = 0; index < adjustments.length; index += 1) {
    const adjustment = adjustments[index];
    const item = await getStockItemDocument(adjustment.itemId);
    const minStock = Number(adjustment.minStock);

    if (!Number.isFinite(minStock) || minStock < 0) {
      throw new Error('预警值必须是大于等于 0 的数字');
    }

    const previousMinStock = Number(item.minStock || 0);
    const movement = {
      id: createId(`threshold-${index}`),
      itemId: item.id,
      itemName: item.name,
      type: '预警值调整',
      quantity: minStock,
      unit: item.unit,
      operator,
      operatorUuid,
      date,
      remark: adjustment.remark || `预警值由 ${previousMinStock}${item.unit} 调整为 ${minStock}${item.unit}`
    };

    await Promise.all([
      getCollection(CLOUD_COLLECTIONS.stockItems)
        .doc(item.id)
        .update({
          data: {
            minStock
          }
        }),
      saveDocument(CLOUD_COLLECTIONS.stockMovements, movement)
    ]);
  }

  return { success: true };
}

async function getEquipmentRecords() {
  const records = await fetchCollectionDocuments(CLOUD_COLLECTIONS.equipmentUsageRecords, {
    orderField: 'startTime',
    orderDirection: 'desc'
  });
  return records.slice().sort(sortByRangeDesc);
}

async function getLabRecords() {
  const [stockItems, instrumentRecords, reagentRecords] = await Promise.all([
    fetchCollectionDocuments(CLOUD_COLLECTIONS.stockItems),
    fetchCollectionDocuments(CLOUD_COLLECTIONS.instrumentUsageRecords, {
      orderField: 'date',
      orderDirection: 'desc'
    }),
    fetchCollectionDocuments(CLOUD_COLLECTIONS.reagentUsageRecords, {
      orderField: 'date',
      orderDirection: 'desc'
    })
  ]);

  return {
    instrumentRecords: instrumentRecords.slice().sort(sortByDateDesc),
    reagentRecords: reagentRecords.slice().sort(sortByDateDesc),
    reagentCatalog: stockItems
      .filter((item) => item.category === '试剂')
      .map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        isHazardous: !!item.isHazardous,
        hazardType: item.hazardType || ''
      })),
    instrumentCatalog: stockItems
      .filter((item) => item.category === '仪器')
      .map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit
      }))
  };
}

async function addEquipmentUsage(payload) {
  const record = {
    id: createId('eq'),
    deviceName: payload.deviceName,
    user: payload.user,
    operatorUuid: payload.operatorUuid || '',
    purpose: payload.purpose,
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: normalizeUsageStatus(payload.status || STATUS_OPTIONS[0]),
    remark: payload.remark || ''
  };

  await saveDocument(CLOUD_COLLECTIONS.equipmentUsageRecords, record);
  return clone(record);
}

async function addInstrumentUsage(payload) {
  const record = {
    id: createId('inst'),
    instrumentName: payload.instrumentName,
    user: payload.user,
    operatorUuid: payload.operatorUuid || '',
    project: payload.project,
    date: payload.date,
    startTime: payload.startTime || '',
    endTime: payload.endTime || '',
    status: normalizeUsageStatus(payload.status || STATUS_OPTIONS[1]),
    duration: payload.duration,
    remark: payload.remark || ''
  };

  await saveDocument(CLOUD_COLLECTIONS.instrumentUsageRecords, record);
  return clone(record);
}

async function addReagentUsage(payload) {
  const record = {
    id: createId('rea'),
    reagentName: payload.reagentName,
    amount: Number(payload.amount || 0),
    unit: payload.unit,
    user: payload.user,
    operatorUuid: payload.operatorUuid || '',
    date: payload.date,
    time: payload.time || '',
    usedAt: payload.usedAt || '',
    purpose: payload.purpose,
    isHazardous: !!payload.isHazardous,
    hazardType: payload.hazardType || '',
    remark: payload.remark || ''
  };

  await saveDocument(CLOUD_COLLECTIONS.reagentUsageRecords, record);
  return clone(record);
}

async function submitReagentUsage(payload) {
  if (!payload || !payload.itemId) {
    throw new Error('请先选择试剂');
  }

  const usedAt = payload.usedAt || (payload.date && payload.time ? `${payload.date} ${payload.time}` : payload.date || getNow());
  const movement = await addStockMovement({
    itemId: payload.itemId,
    type: '出库',
    quantity: payload.amount,
    operator: payload.user,
    operatorUuid: payload.operatorUuid,
    remark: payload.purpose || payload.remark || '试剂使用',
    date: usedAt,
    source: 'reagent_usage'
  });

  const reagentRecord = await addReagentUsage(payload);
  return {
    movement,
    reagentRecord
  };
}

const ACTION_HANDLERS = {
  ensureSeedData,
  getDashboardMetrics,
  getInventory,
  getInventoryCatalog,
  getInventoryRecordLedger,
  createStockItem,
  addStockMovement,
  applyDraftMovements,
  applyStocktakeAdjustments,
  applyThresholdUpdates,
  getEquipmentRecords,
  getLabRecords,
  addEquipmentUsage,
  addInstrumentUsage,
  addReagentUsage,
  submitReagentUsage
};

exports.main = async (event) => {
  try {
    const action = event && event.action ? event.action : '';
    const payload = event && event.payload ? event.payload : {};
    const handler = ACTION_HANDLERS[action];

    if (!handler) {
      throw new Error('不支持的数据操作');
    }

    const data = await handler(payload);
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      message: error && error.message ? error.message : '数据操作失败'
    };
  }
};
