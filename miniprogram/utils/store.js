let bootstrapPromise = null;

function ensureCloudReady() {
  if (!wx.cloud) {
    throw new Error('当前环境未启用云开发');
  }
}

async function callDataProxy(action, payload) {
  ensureCloudReady();

  const response = await wx.cloud.callFunction({
    name: 'dataProxy',
    data: Object.assign({ action }, payload || {})
  });

  const result = response && response.result ? response.result : {};
  if (!result.success) {
    throw new Error(result.message || '数据服务调用失败');
  }

  return result.data;
}

function ensureSeedData() {
  if (!bootstrapPromise) {
    bootstrapPromise = callDataProxy('bootstrap').catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  return bootstrapPromise;
}

async function withBootstrap(action, payload) {
  await ensureSeedData();
  return callDataProxy(action, payload);
}

module.exports = {
  ensureSeedData,
  getDashboardMetrics() {
    return withBootstrap('getDashboardMetrics');
  },
  getInventory(filter) {
    return withBootstrap('getInventory', { filter });
  },
  getInventoryCatalog() {
    return withBootstrap('getInventoryCatalog');
  },
  createStockItem(payload) {
    return withBootstrap('createStockItem', { payload });
  },
  addStockMovement(payload) {
    return withBootstrap('addStockMovement', { payload });
  },
  applyDraftMovements(draftLines, options) {
    return withBootstrap('applyDraftMovements', { draftLines, options });
  },
  applyStocktakeAdjustments(adjustments, options) {
    return withBootstrap('applyStocktakeAdjustments', { adjustments, options });
  },
  applyThresholdUpdates(adjustments, options) {
    return withBootstrap('applyThresholdUpdates', { adjustments, options });
  },
  getEquipmentRecords() {
    return withBootstrap('getEquipmentRecords');
  },
  getLabRecords() {
    return withBootstrap('getLabRecords');
  },
  addEquipmentUsage(payload) {
    return withBootstrap('addEquipmentUsage', { payload });
  },
  addInstrumentUsage(payload) {
    return withBootstrap('addInstrumentUsage', { payload });
  },
  addReagentUsage(payload) {
    return withBootstrap('addReagentUsage', { payload });
  }
};
