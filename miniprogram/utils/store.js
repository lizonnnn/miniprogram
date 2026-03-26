const FUNCTION_NAME = 'dataStore';

function ensureCloudReady() {
  if (!wx.cloud || !wx.cloud.callFunction) {
    throw new Error('请先在微信开发者工具中启用云开发并选择环境');
  }
}

async function callStore(action, payload) {
  ensureCloudReady();

  const response = await wx.cloud.callFunction({
    name: FUNCTION_NAME,
    data: {
      action,
      payload: payload || {}
    }
  });

  const result = response && response.result ? response.result : {};
  if (!result.success) {
    throw new Error(result.message || '云函数调用失败');
  }

  return result.data;
}

function ensureSeedData() {
  return callStore('ensureSeedData');
}

function getDashboardMetrics() {
  return callStore('getDashboardMetrics');
}

function getInventory(filter) {
  return callStore('getInventory', { filter });
}

function getInventoryCatalog() {
  return callStore('getInventoryCatalog');
}

function getInventoryRecordLedger() {
  return callStore('getInventoryRecordLedger');
}

function createStockItem(payload) {
  return callStore('createStockItem', payload);
}

function addStockMovement(payload) {
  return callStore('addStockMovement', payload);
}

function applyDraftMovements(draftLines, options) {
  return callStore('applyDraftMovements', {
    draftLines,
    options
  });
}

function applyStocktakeAdjustments(adjustments, options) {
  return callStore('applyStocktakeAdjustments', {
    adjustments,
    options
  });
}

function applyThresholdUpdates(adjustments, options) {
  return callStore('applyThresholdUpdates', {
    adjustments,
    options
  });
}

function getEquipmentRecords() {
  return callStore('getEquipmentRecords');
}

function getLabRecords() {
  return callStore('getLabRecords');
}

function addEquipmentUsage(payload) {
  return callStore('addEquipmentUsage', payload);
}

function addInstrumentUsage(payload) {
  return callStore('addInstrumentUsage', payload);
}

function addReagentUsage(payload) {
  return callStore('addReagentUsage', payload);
}

function submitReagentUsage(payload) {
  return callStore('submitReagentUsage', payload);
}

module.exports = {
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
