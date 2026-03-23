const http = require('http');
const https = require('https');
const { URL } = require('url');

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

function validateConfig() {
  if (!process.env.SUPABASE_URL) {
    throw new Error('请先配置 SUPABASE_URL。');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('请先配置 SUPABASE_SERVICE_ROLE_KEY。');
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now()}`;
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

function normalizeStockItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    spec: row.spec,
    unit: row.unit,
    stock: Number(row.stock || 0),
    minStock: Number(row.min_stock || 0),
    location: row.location,
    isHazardous: !!row.is_hazardous,
    hazardType: row.hazard_type || ''
  };
}

function normalizeMovement(row) {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    type: row.type,
    quantity: Number(row.quantity || 0),
    unit: row.unit,
    operator: row.operator_name,
    date: row.date,
    remark: row.remark || ''
  };
}

function normalizeEquipmentUsage(row) {
  return {
    id: row.id,
    deviceName: row.device_name,
    user: row.user_name,
    purpose: row.purpose,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    remark: row.remark || ''
  };
}

function normalizeInstrumentUsage(row) {
  return {
    id: row.id,
    instrumentName: row.instrument_name,
    user: row.user_name,
    project: row.project,
    date: row.date,
    duration: row.duration,
    remark: row.remark || ''
  };
}

function normalizeReagentUsage(row) {
  return {
    id: row.id,
    reagentName: row.reagent_name,
    amount: Number(row.amount || 0),
    unit: row.unit,
    user: row.user_name,
    date: row.date,
    purpose: row.purpose,
    isHazardous: !!row.is_hazardous,
    hazardType: row.hazard_type || '',
    remark: row.remark || ''
  };
}

function toStockItemRow(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    spec: item.spec,
    unit: item.unit,
    stock: Number(item.stock || 0),
    min_stock: Number(item.minStock || 0),
    location: item.location,
    is_hazardous: !!item.isHazardous,
    hazard_type: item.hazardType || ''
  };
}

function toMovementRow(item) {
  return {
    id: item.id,
    item_id: item.itemId,
    item_name: item.itemName,
    type: item.type,
    quantity: Number(item.quantity || 0),
    unit: item.unit,
    operator_name: item.operator,
    date: item.date,
    remark: item.remark || ''
  };
}

function toEquipmentRow(item) {
  return {
    id: item.id,
    device_name: item.deviceName,
    user_name: item.user,
    purpose: item.purpose,
    start_time: item.startTime,
    end_time: item.endTime,
    status: item.status,
    remark: item.remark || ''
  };
}

function toInstrumentRow(item) {
  return {
    id: item.id,
    instrument_name: item.instrumentName,
    user_name: item.user,
    project: item.project,
    date: item.date,
    duration: item.duration,
    remark: item.remark || ''
  };
}

function toReagentRow(item) {
  return {
    id: item.id,
    reagent_name: item.reagentName,
    amount: Number(item.amount || 0),
    unit: item.unit,
    user_name: item.user,
    date: item.date,
    purpose: item.purpose,
    is_hazardous: !!item.isHazardous,
    hazard_type: item.hazardType || '',
    remark: item.remark || ''
  };
}

function getTransport(url) {
  return url.protocol === 'http:' ? http : https;
}

async function requestSupabase(method, path, options) {
  const base = new URL(process.env.SUPABASE_URL);
  const url = new URL(path, `${base.origin}/`);
  const query = options && options.query ? options.query : {};
  Object.keys(query).forEach((key) => {
    if (query[key] !== undefined && query[key] !== null && query[key] !== '') {
      url.searchParams.set(key, query[key]);
    }
  });

  const body = options && options.body !== undefined ? JSON.stringify(options.body) : '';
  const transport = getTransport(url);

  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'http:' ? 80 : 443),
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body || '')
        }
      },
      (response) => {
        let responseText = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseText += chunk;
        });
        response.on('end', () => {
          const statusCode = response.statusCode || 500;
          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Supabase 请求失败：${statusCode} ${responseText}`));
            return;
          }

          if (!responseText) {
            resolve(null);
            return;
          }

          try {
            resolve(JSON.parse(responseText));
          } catch (error) {
            reject(new Error(`Supabase 返回了非 JSON 内容：${responseText}`));
          }
        });
      }
    );

    request.on('error', reject);
    request.write(body || '');
    request.end();
  });
}

async function listRows(table, orderBy) {
  return requestSupabase('GET', `/rest/v1/${table}`, {
    query: {
      select: '*',
      order: orderBy || 'id.asc'
    }
  });
}

async function insertRows(table, rows) {
  return requestSupabase('POST', `/rest/v1/${table}`, {
    body: rows,
    query: {
      select: '*'
    }
  });
}

async function updateRows(table, filters, payload) {
  return requestSupabase('PATCH', `/rest/v1/${table}`, {
    body: payload,
    query: Object.assign({}, filters, { select: '*' })
  });
}

async function fetchStockItems() {
  const rows = await listRows('stock_items', 'name.asc');
  return Array.isArray(rows) ? rows.map(normalizeStockItem) : [];
}

async function fetchStockMovements() {
  const rows = await listRows('stock_movements', 'date.desc');
  return Array.isArray(rows) ? rows.map(normalizeMovement) : [];
}

async function fetchEquipmentUsageRecords() {
  const rows = await listRows('equipment_usage_records', 'start_time.desc');
  return Array.isArray(rows) ? rows.map(normalizeEquipmentUsage) : [];
}

async function fetchInstrumentUsageRecords() {
  const rows = await listRows('instrument_usage_records', 'date.desc');
  return Array.isArray(rows) ? rows.map(normalizeInstrumentUsage) : [];
}

async function fetchReagentUsageRecords() {
  const rows = await listRows('reagent_usage_records', 'date.desc');
  return Array.isArray(rows) ? rows.map(normalizeReagentUsage) : [];
}

async function bootstrap() {
  const existing = await requestSupabase('GET', '/rest/v1/stock_items', {
    query: {
      select: 'id',
      limit: '1'
    }
  });

  if (Array.isArray(existing) && existing.length) {
    return { initialized: false };
  }

  await insertRows('stock_items', seedData.stockItems.map(toStockItemRow));
  await insertRows('stock_movements', seedData.stockMovements.map(toMovementRow));
  await insertRows('equipment_usage_records', seedData.equipmentUsageRecords.map(toEquipmentRow));
  await insertRows('instrument_usage_records', seedData.instrumentUsageRecords.map(toInstrumentRow));
  await insertRows('reagent_usage_records', seedData.reagentUsageRecords.map(toReagentRow));

  return { initialized: true };
}

async function getDashboardMetrics() {
  const [stockItems, stockMovements, equipmentUsageRecords, reagentUsageRecords] = await Promise.all([
    fetchStockItems(),
    fetchStockMovements(),
    fetchEquipmentUsageRecords(),
    fetchReagentUsageRecords()
  ]);

  const lowStockCount = stockItems.filter((item) => Number(item.stock || 0) <= Number(item.minStock || 0)).length;
  const hazardousCount = stockItems.filter((item) => item.isHazardous).length;
  const activeEquipmentCount = equipmentUsageRecords.filter((item) => item.status === '使用中').length;

  return {
    totalSku: stockItems.length,
    lowStockCount,
    hazardousCount,
    activeEquipmentCount,
    recentMovements: stockMovements.slice().sort(sortByDateDesc).slice(0, 4),
    equipmentUsageRecords: equipmentUsageRecords.slice().sort(sortByRangeDesc).slice(0, 3),
    reagentUsageRecords: reagentUsageRecords.slice().sort(sortByDateDesc).slice(0, 3)
  };
}

async function getInventory(filter) {
  const [stockItems, stockMovements] = await Promise.all([fetchStockItems(), fetchStockMovements()]);
  const items = stockItems
    .filter((item) => !filter || filter === '全部' || item.category === filter)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  return {
    items,
    movements: stockMovements.slice().sort(sortByDateDesc),
    stockOptions: stockItems.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      category: item.category
    }))
  };
}

async function getInventoryCatalog() {
  const stockItems = await fetchStockItems();
  return stockItems
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

async function createStockItem(payload) {
  if (!payload || !payload.name || !payload.category || !payload.unit) {
    throw new Error('新建物资至少需要名称、分类和单位');
  }

  const stockItems = await fetchStockItems();
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

  if (stockItems.some((current) => current.name === item.name)) {
    throw new Error('已存在同名物资，请先确认是否需要直接选择现有物资。');
  }

  const rows = await insertRows('stock_items', [toStockItemRow(item)]);
  return normalizeStockItem((rows || [])[0] || toStockItemRow(item));
}

async function getEquipmentRecords() {
  const records = await fetchEquipmentUsageRecords();
  return records.slice().sort(sortByRangeDesc);
}

async function getLabRecords() {
  const [stockItems, instrumentRecords, reagentRecords] = await Promise.all([
    fetchStockItems(),
    fetchInstrumentUsageRecords(),
    fetchReagentUsageRecords()
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

async function getStockItemById(itemId) {
  const rows = await requestSupabase('GET', '/rest/v1/stock_items', {
    query: {
      select: '*',
      id: `eq.${itemId}`,
      limit: '1'
    }
  });

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    throw new Error('未找到对应物资');
  }

  return normalizeStockItem(row);
}

async function patchStockItem(itemId, payload) {
  const rows = await updateRows('stock_items', { id: `eq.${itemId}` }, payload);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    throw new Error('更新物资失败');
  }

  return normalizeStockItem(row);
}

async function addStockMovement(payload) {
  const item = await getStockItemById(payload.itemId);
  const type = payload.type;
  const quantity = Number(payload.quantity || 0);

  if (type !== '入库' && type !== '出库') {
    throw new Error('库存操作类型只能是入库或出库');
  }

  if (!quantity || quantity <= 0) {
    throw new Error('数量必须大于 0');
  }

  if (type === '出库' && Number(item.stock || 0) < quantity) {
    throw new Error('库存不足，无法出库');
  }

  const nextStock = type === '入库' ? Number(item.stock || 0) + quantity : Number(item.stock || 0) - quantity;
  await patchStockItem(item.id, {
    stock: nextStock
  });

  const rows = await insertRows('stock_movements', [{
    id: createId('move'),
    item_id: item.id,
    item_name: item.name,
    type,
    quantity,
    unit: item.unit,
    operator_name: payload.operator || '未填写',
    date: payload.date || getNow(),
    remark: payload.remark || ''
  }]);

  return normalizeMovement((rows || [])[0] || {});
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

async function applyStocktakeAdjustments(adjustments, options) {
  if (!Array.isArray(adjustments) || !adjustments.length) {
    throw new Error('没有可执行的盘点调整');
  }

  const operator = options && options.operator ? options.operator : '未填写';
  const date = options && options.date ? options.date : getNow();

  for (let index = 0; index < adjustments.length; index += 1) {
    const adjustment = adjustments[index];
    const item = await getStockItemById(adjustment.itemId);
    const countedQuantity = Number(adjustment.countedQuantity);

    if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
      throw new Error('盘点数量必须是大于等于 0 的数字');
    }

    const previousQuantity = Number(item.stock || 0);
    const difference = countedQuantity - previousQuantity;

    await patchStockItem(item.id, {
      stock: countedQuantity
    });

    await insertRows('stock_movements', [{
      id: createId(`stocktake-${index}`),
      item_id: item.id,
      item_name: item.name,
      type: '盘点',
      quantity: countedQuantity,
      unit: item.unit,
      operator_name: operator,
      date,
      remark: adjustment.remark || `盘点后由 ${previousQuantity}${item.unit} 调整为 ${countedQuantity}${item.unit}，差异 ${difference >= 0 ? '+' : ''}${difference}${item.unit}`
    }]);
  }

  return { success: true };
}

async function applyThresholdUpdates(adjustments, options) {
  if (!Array.isArray(adjustments) || !adjustments.length) {
    throw new Error('没有可执行的预警值调整');
  }

  const operator = options && options.operator ? options.operator : '未填写';
  const date = options && options.date ? options.date : getNow();

  for (let index = 0; index < adjustments.length; index += 1) {
    const adjustment = adjustments[index];
    const item = await getStockItemById(adjustment.itemId);
    const minStock = Number(adjustment.minStock);

    if (!Number.isFinite(minStock) || minStock < 0) {
      throw new Error('预警值必须是大于等于 0 的数字');
    }

    const previousMinStock = Number(item.minStock || 0);
    await patchStockItem(item.id, {
      min_stock: minStock
    });

    await insertRows('stock_movements', [{
      id: createId(`threshold-${index}`),
      item_id: item.id,
      item_name: item.name,
      type: '预警值调整',
      quantity: minStock,
      unit: item.unit,
      operator_name: operator,
      date,
      remark: adjustment.remark || `预警值由 ${previousMinStock}${item.unit} 调整为 ${minStock}${item.unit}`
    }]);
  }

  return { success: true };
}

async function addEquipmentUsage(payload) {
  const rows = await insertRows('equipment_usage_records', [{
    id: createId('eq'),
    device_name: payload.deviceName,
    user_name: payload.user,
    purpose: payload.purpose,
    start_time: payload.startTime,
    end_time: payload.endTime,
    status: payload.status,
    remark: payload.remark || ''
  }]);

  return normalizeEquipmentUsage((rows || [])[0] || {});
}

async function addInstrumentUsage(payload) {
  const rows = await insertRows('instrument_usage_records', [{
    id: createId('inst'),
    instrument_name: payload.instrumentName,
    user_name: payload.user,
    project: payload.project,
    date: payload.date,
    duration: payload.duration,
    remark: payload.remark || ''
  }]);

  return normalizeInstrumentUsage((rows || [])[0] || {});
}

async function addReagentUsage(payload) {
  const rows = await insertRows('reagent_usage_records', [{
    id: createId('rea'),
    reagent_name: payload.reagentName,
    amount: Number(payload.amount || 0),
    unit: payload.unit,
    user_name: payload.user,
    date: payload.date,
    purpose: payload.purpose,
    is_hazardous: !!payload.isHazardous,
    hazard_type: payload.hazardType || '',
    remark: payload.remark || ''
  }]);

  return normalizeReagentUsage((rows || [])[0] || {});
}

const handlers = {
  bootstrap,
  getDashboardMetrics: () => getDashboardMetrics(),
  getInventory: (event) => getInventory(event.filter),
  getInventoryCatalog: () => getInventoryCatalog(),
  createStockItem: (event) => createStockItem(event.payload),
  addStockMovement: (event) => addStockMovement(event.payload),
  applyDraftMovements: (event) => applyDraftMovements(event.draftLines, event.options),
  applyStocktakeAdjustments: (event) => applyStocktakeAdjustments(event.adjustments, event.options),
  applyThresholdUpdates: (event) => applyThresholdUpdates(event.adjustments, event.options),
  getEquipmentRecords: () => getEquipmentRecords(),
  getLabRecords: () => getLabRecords(),
  addEquipmentUsage: (event) => addEquipmentUsage(event.payload),
  addInstrumentUsage: (event) => addInstrumentUsage(event.payload),
  addReagentUsage: (event) => addReagentUsage(event.payload)
};

exports.main = async (event) => {
  try {
    validateConfig();

    const action = event && event.action;
    if (!action || !handlers[action]) {
      throw new Error('不支持的数据操作');
    }

    const data = await handlers[action](event || {});
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Supabase 数据代理执行失败'
    };
  }
};
