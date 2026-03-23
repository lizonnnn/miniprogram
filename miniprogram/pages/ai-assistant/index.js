const store = require('../../utils/store');

const INTRO_TEXT =
  '可以直接告诉我你想入库、出库、查询库存、盘点，或者修改预警值；我会继续追问缺失信息，并在操作清楚时给你确认卡片。';
const INVENTORY_TAB_PATH = '/miniprogram/pages/inventory/index';

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function formatNumber(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const number = Number(value);
  if (Number.isNaN(number)) {
    return `${value}`;
  }

  return Number.isInteger(number) ? `${number}` : `${number}`.replace(/0+$/, '').replace(/\.$/, '');
}

function getNow() {
  const date = new Date();
  const pad = (value) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createTextMessage(role, text) {
  return {
    id: createId(`msg-${role}`),
    kind: 'text',
    role,
    text
  };
}

function isFunctionTimeoutError(error) {
  const message = `${(error && error.message) || error || ''}`;
  return message.includes('Invoking task timed out')
    || message.includes('FUNCTIONS_TIME_LIMIT_EXCEEDED')
    || message.includes('timed out');
}

function createResultCardMessage(card) {
  return {
    id: createId('card-result'),
    kind: 'result_card',
    role: 'assistant',
    card
  };
}

function createPendingActionMessage(action) {
  return {
    id: createId('card-action'),
    kind: 'pending_action',
    role: 'assistant',
    actionType: action.type,
    title: action.title,
    summary: action.summary,
    buttonText: action.buttonText,
    requiresOperator: action.requiresOperator,
    items: action.items,
    completed: false,
    completionNote: ''
  };
}

function findCatalogItem(catalog, itemId) {
  if (!itemId) {
    return null;
  }

  return catalog.find((item) => item.id === itemId) || null;
}

function composeDraftText(line) {
  const segments = [];

  if (line.type) {
    segments.push(line.type);
  }

  if (line.itemName) {
    segments.push(line.itemName);
  }

  const quantityText = formatNumber(line.quantity);
  if (quantityText) {
    segments.push(`${quantityText}${line.unit || ''}`);
  }

  return segments.join(' ').trim() || line.text || '鏈敓鎴愬緟鎵ц鍐呭';
}

function buildCreateForm(line) {
  const suggestion = line.createSuggestion || {};
  return {
    name: suggestion.name || line.itemName || '',
    category: suggestion.category || '璇曞墏',
    spec: suggestion.spec || '',
    unit: suggestion.unit || line.unit || '',
    location: suggestion.location || '',
    stock: suggestion.stock !== undefined ? `${suggestion.stock}` : line.type === '鍑哄簱' ? `${formatNumber(line.quantity)}` : '0',
    minStock: suggestion.minStock !== undefined ? `${suggestion.minStock}` : '0',
    isHazardous: !!suggestion.isHazardous,
    hazardType: suggestion.hazardType || ''
  };
}

function normalizeDraftLine(line, index, catalog) {
  const candidates = Array.isArray(line.candidates)
    ? line.candidates.map((candidate) => ({
        itemId: candidate.itemId || candidate.id || '',
        name: candidate.name || '',
        category: candidate.category || '',
        spec: candidate.spec || '',
        unit: candidate.unit || '',
        location: candidate.location || '',
        reason: candidate.reason || ''
      }))
    : [];

  const quantity = Number(line.quantity);
  const itemId = line.itemId || '';
  const catalogItem = findCatalogItem(catalog, itemId);
  const hasCreateSuggestion = !!line.createSuggestion;
  const status = line.status === 'needs_create' || (!itemId && hasCreateSuggestion && !candidates.length)
    ? 'needs_create'
    : line.status === 'needs_selection' || !itemId
      ? 'needs_selection'
      : 'confirmed';

  const normalizedLine = {
    draftId: line.draftId || createId(`draft-${index}`),
    text: line.text || '',
    type: line.type || '',
    quantity: Number.isFinite(quantity) ? quantity : line.quantity,
    unit: line.unit || (catalogItem ? catalogItem.unit : ''),
    itemId,
    itemName: line.itemName || (catalogItem ? catalogItem.name : ''),
    remark: line.remark || '',
    status,
    selectionHint: line.selectionHint || '',
    candidates,
    createSuggestion: line.createSuggestion || null
  };

  normalizedLine.text = composeDraftText(normalizedLine);
  normalizedLine.createForm = buildCreateForm(normalizedLine);
  return normalizedLine;
}

function normalizeResultCard(card, index, catalog) {
  const items = Array.isArray(card.items)
    ? card.items
    : card.items && typeof card.items === 'object'
      ? [card.items]
      : [];

  return {
    id: card.id || createId(`result-${index}`),
    cardType: card.cardType || 'inventory_query',
    title: card.title || '搴撳瓨缁撴灉',
    summary: card.summary || '',
    items: items
      .map((item) => {
          const itemId = item.itemId || item.id || '';
          const itemName = item.name || item.itemName || '';
          const catalogItem = findCatalogItem(catalog, itemId) || catalog.find((current) => current.name === itemName) || null;
          const beforeStock = Number(item.beforeStock);
          const beforeMinStock = Number(item.beforeMinStock);
          const minStock = Number(item.minStock);
          return {
            itemId,
            name: itemName || (catalogItem ? catalogItem.name : ''),
            stock: catalogItem ? catalogItem.stock : Number(item.stock || 0),
            beforeStock: Number.isFinite(beforeStock) ? beforeStock : null,
            minStock: Number.isFinite(minStock) ? minStock : (catalogItem ? Number(catalogItem.minStock || 0) : null),
            beforeMinStock: Number.isFinite(beforeMinStock) ? beforeMinStock : null,
            unit: item.unit || (catalogItem ? catalogItem.unit : ''),
            spec: item.spec || (catalogItem ? catalogItem.spec : ''),
            location: item.location || (catalogItem ? catalogItem.location : '')
          };
        })
  };
}

function mergeResultCards(cards) {
  if (!Array.isArray(cards) || !cards.length) {
    return null;
  }

  const mergedItems = [];
  const mergedMap = {};

  cards.forEach((card) => {
    (card.items || []).forEach((item) => {
      const key = item.itemId || item.name;
      if (!key) {
        return;
      }

      if (!mergedMap[key]) {
        mergedMap[key] = Object.assign({}, item);
        mergedItems.push(mergedMap[key]);
        return;
      }

      mergedMap[key] = Object.assign(mergedMap[key], {
        itemId: mergedMap[key].itemId || item.itemId,
        name: mergedMap[key].name || item.name,
        stock: item.stock !== undefined ? item.stock : mergedMap[key].stock,
        beforeStock: item.beforeStock !== undefined && item.beforeStock !== null ? item.beforeStock : mergedMap[key].beforeStock,
        minStock: item.minStock !== undefined && item.minStock !== null ? item.minStock : mergedMap[key].minStock,
        beforeMinStock: item.beforeMinStock !== undefined && item.beforeMinStock !== null ? item.beforeMinStock : mergedMap[key].beforeMinStock,
        unit: mergedMap[key].unit || item.unit,
        spec: mergedMap[key].spec || item.spec,
        location: mergedMap[key].location || item.location
      });

      const index = mergedItems.findIndex((current) => (current.itemId || current.name) === key);
      if (index > -1) {
        mergedItems[index] = mergedMap[key];
      }
    });
  });

  const firstCard = cards[0] || {};
  return {
    id: createId('result-merged'),
    cardType: 'inventory_query',
    title: firstCard.title || '搴撳瓨缁撴灉',
    summary: firstCard.summary || (mergedItems.length ? ('已整理 ' + mergedItems.length + ' 条库存明细') : '暂无可展示的库存明细'),
    items: mergedItems
  };
}

function buildOperationInventoryCard(action, draftLines, beforeCatalog, afterCatalog) {
  const sourceItems = action.type === 'movement_confirm' ? draftLines : action.items;
  if (!Array.isArray(sourceItems) || !sourceItems.length) {
    return null;
  }

  const relatedIds = [];
  sourceItems.forEach((item) => {
    if (item && item.itemId && !relatedIds.includes(item.itemId)) {
      relatedIds.push(item.itemId);
    }
  });

  if (!relatedIds.length) {
    return null;
  }

  return {
    id: createId('result-operation'),
    cardType: 'inventory_query',
    title: '鐩稿叧搴撳瓨',
    summary: '宸茶嚜鍔ㄥ睍绀烘湰娆℃搷浣滃墠鍚庣殑鐩稿叧搴撳瓨',
    items: relatedIds
      .map((itemId) => {
        const beforeItem = findCatalogItem(beforeCatalog, itemId);
        const afterItem = findCatalogItem(afterCatalog, itemId);
        const current = afterItem || beforeItem;

        if (!current) {
          return null;
        }

        return {
          itemId,
          name: current.name,
          stock: Number(afterItem ? afterItem.stock : current.stock || 0),
          beforeStock: beforeItem ? Number(beforeItem.stock || 0) : null,
          minStock: Number(afterItem ? afterItem.minStock : current.minStock || 0),
          beforeMinStock: beforeItem ? Number(beforeItem.minStock || 0) : null,
          unit: current.unit || '',
          spec: current.spec || '',
          location: current.location || ''
        };
      })
      .filter(Boolean)
  };
}

function normalizePendingAction(action, catalog) {
  if (!action || !action.type) {
    return null;
  }

  if (
    action.type !== 'movement_confirm'
    && action.type !== 'stocktake_confirm'
    && action.type !== 'threshold_confirm'
  ) {
    return null;
  }

  return {
    type: action.type,
    title: action.title || '请确认本次操作',
    summary: action.summary || '',
    buttonText: action.buttonText || '纭鎵ц',
    requiresOperator: action.requiresOperator !== false,
    items: Array.isArray(action.items)
      ? action.items.map((item) => {
          const catalogItem = findCatalogItem(catalog, item.itemId || item.id || '');
          const quantity = Number(item.quantity);
          const currentQuantity = Number(item.currentQuantity);
          const countedQuantity = Number(item.countedQuantity);
          const difference = Number(item.difference);
          const currentMinStock = Number(item.currentMinStock);
          const minStock = Number(item.minStock);

          return {
            type: item.type === '鍏ュ簱' || item.type === '鍑哄簱' ? item.type : '',
            itemId: item.itemId || item.id || '',
            itemName: item.itemName || item.name || (catalogItem ? catalogItem.name : ''),
            unit: item.unit || (catalogItem ? catalogItem.unit : ''),
            quantity: Number.isFinite(quantity) ? quantity : 0,
            currentQuantity: Number.isFinite(currentQuantity) ? currentQuantity : (catalogItem ? Number(catalogItem.stock || 0) : 0),
            countedQuantity: Number.isFinite(countedQuantity) ? countedQuantity : 0,
            difference: Number.isFinite(difference)
              ? difference
              : (Number.isFinite(countedQuantity) && catalogItem ? countedQuantity - Number(catalogItem.stock || 0) : 0),
            currentMinStock: Number.isFinite(currentMinStock)
              ? currentMinStock
              : (catalogItem ? Number(catalogItem.minStock || 0) : 0),
            minStock: Number.isFinite(minStock) ? minStock : 0,
            remark: item.remark || ''
          };
        })
      : []
  };
}

function sanitizeDraftLines(lines) {
  return Array.isArray(lines)
    ? lines.map((line) => ({
        draftId: line.draftId,
        text: line.text,
        type: line.type,
        quantity: line.quantity,
        unit: line.unit,
        itemId: line.itemId,
        itemName: line.itemName,
        remark: line.remark,
        status: line.status,
        selectionHint: line.selectionHint,
        candidates: line.candidates,
        createSuggestion: line.createSuggestion
      }))
    : [];
}

function sanitizePendingAction(action) {
  if (!action) {
    return null;
  }

  return {
    type: action.type,
    title: action.title,
    summary: action.summary,
    buttonText: action.buttonText,
    requiresOperator: action.requiresOperator,
    items: action.items
  };
}

function buildDraftState(draftLines) {
  return {
    hasDraftLines: draftLines.length > 0,
    pendingCount: draftLines.filter((line) => line.status !== 'confirmed').length
  };
}

Page({
  data: {
    sessionNumber: 1,
    messages: [],
    draftLines: [],
    pendingAction: null,
    inputText: '',
    operatorName: '',
    sending: false,
    confirming: false,
    hasDraftLines: false,
    pendingCount: 0
  },

  async refreshCatalog() {
    const catalog = await store.getInventoryCatalog();
    this.catalog = Array.isArray(catalog) ? catalog : [];
    return this.catalog;
  },

  async ensureCatalog() {
    if (Array.isArray(this.catalog)) {
      return this.catalog;
    }

    if (!this.catalogPromise) {
      this.catalogPromise = this.refreshCatalog()
        .finally(() => {
          this.catalogPromise = null;
        });
    }

    return this.catalogPromise;
  },

  onLoad() {
    this.catalog = null;
    this.catalogPromise = null;
    this.setData({
      messages: [createTextMessage('assistant', INTRO_TEXT)]
    });
    this.refreshCatalog().catch((error) => {
      console.error('加载库存目录失败', error);
    });
  },

  onShow() {
    this.refreshCatalog().catch((error) => {
      console.error('刷新库存目录失败', error);
    });
  },

  onInputChange(event) {
    this.setData({
      inputText: event.detail.value
    });
  },

  onOperatorInput(event) {
    this.setData({
      operatorName: event.detail.value
    });
  },

  copyMessage(event) {
    const text = event.currentTarget.dataset.text || '';
    if (!text) {
      return;
    }

    wx.setClipboardData({
      data: text,
      success() {
        wx.showToast({
          title: 'Copied',
          icon: 'success'
        });
      }
    });
  },

  onCreateFieldInput(event) {
    const lineIndex = Number(event.currentTarget.dataset.lineIndex);
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`draftLines[${lineIndex}].createForm.${field}`]: event.detail.value
    });
  },

  onCreateSwitchChange(event) {
    const lineIndex = Number(event.currentTarget.dataset.lineIndex);
    this.setData({
      [`draftLines[${lineIndex}].createForm.isHazardous`]: !!event.detail.value
    });
  },

  renderAiPayload(payload, baseMessages, catalog, options) {
    const draftLines = Array.isArray(payload.draftLines)
      ? payload.draftLines.map((line, index) => normalizeDraftLine(line, index, catalog))
      : [];
    const rawResultCards = Array.isArray(payload.resultCards)
      ? payload.resultCards
      : (payload.resultCards && typeof payload.resultCards === 'object' ? [payload.resultCards] : []);
    const resultCards = (options && options.ignoreResultCards)
      ? []
      : rawResultCards.map((card, index) => normalizeResultCard(card, index, catalog));
    const pendingAction = normalizePendingAction(payload.pendingAction, catalog);
    const draftState = buildDraftState(draftLines);
    const nextMessages = baseMessages.slice();
    const mergedResultCard = mergeResultCards(resultCards);
    const hasResultItems = !!(mergedResultCard && Array.isArray(mergedResultCard.items) && mergedResultCard.items.length);

    if (payload.assistantReply && !hasResultItems) {
      nextMessages.push(createTextMessage('assistant', payload.assistantReply));
    }

    if (mergedResultCard) {
      nextMessages.push(createResultCardMessage(mergedResultCard));
    }

    let actionState = null;
    if (pendingAction) {
      const actionMessage = createPendingActionMessage(pendingAction);
      actionState = Object.assign({}, pendingAction, { messageId: actionMessage.id });
      nextMessages.push(actionMessage);
    }

    this.setData({
      messages: nextMessages,
      draftLines,
      pendingAction: actionState,
      hasDraftLines: draftState.hasDraftLines,
      pendingCount: draftState.pendingCount
    });
  },

  async sendAiRequest(options) {
    const latestInput = `${options.latestInput || ''}`.trim();
    if (!latestInput || this.data.sending) {
      return;
    }

    if (!wx.cloud) {
      wx.showToast({ title: '请先初始化云开发', icon: 'none' });
      return;
    }

    const draftLines = options.draftLinesOverride || this.data.draftLines;
    const pendingAction = options.pendingActionOverride !== undefined ? options.pendingActionOverride : this.data.pendingAction;
    const baseMessages = options.appendUserMessage
      ? this.data.messages.concat(createTextMessage('user', options.userMessageText || latestInput))
      : this.data.messages.slice();

    this.setData({
      messages: baseMessages,
      inputText: options.clearInput === false ? this.data.inputText : '',
      sending: true
    });

    try {
      const catalog = Array.isArray(options.catalogOverride)
        ? options.catalogOverride
        : await this.ensureCatalog();

      const response = await wx.cloud.callFunction({
        name: 'aiAssistant',
        data: {
          sessionNumber: this.data.sessionNumber,
          latestInput,
          draftLines: sanitizeDraftLines(draftLines),
          pendingAction: sanitizePendingAction(pendingAction),
          catalog
        }
      });

      const result = response && response.result ? response.result : {};
      if (!result.success) {
        throw new Error(result.message || 'AI 调用失败，请稍后重试');
      }

      this.renderAiPayload(result.data || {}, baseMessages, catalog, options);
    } catch (error) {
      const failureMessage = isFunctionTimeoutError(error)
        ? '当前操作失败，云函数处理超时了，请重新输入。'
        : (error.message || 'AI 调用失败，请稍后重试');

      this.setData({
        messages: baseMessages.concat(createTextMessage('assistant', failureMessage))
      });
      wx.showToast({
        title: isFunctionTimeoutError(error) ? '云函数超时，请重新输入' : (error.message || 'AI 调用失败'),
        icon: 'none'
      });
    } finally {
      this.setData({
        sending: false
      });
    }
  },

  submitMessage() {
    const latestInput = (this.data.inputText || '').trim();
    if (!latestInput) {
      return;
    }

    this.sendAiRequest({
      latestInput,
      appendUserMessage: true
    });
  },

  openInventorySearch() {
    wx.switchTab({
      url: INVENTORY_TAB_PATH
    });
  },

  selectCandidate(event) {
    const lineIndex = Number(event.currentTarget.dataset.lineIndex);
    const optionIndex = Number(event.currentTarget.dataset.optionIndex);
    const line = this.data.draftLines[lineIndex];

    if (!line || !Array.isArray(line.candidates) || !line.candidates[optionIndex]) {
      return;
    }

    const option = line.candidates[optionIndex];
    const draftLines = this.data.draftLines.slice();
    const nextLine = Object.assign({}, line, {
      itemId: option.itemId,
      itemName: option.name,
      unit: option.unit || line.unit,
      status: 'confirmed',
      selectionHint: '',
      candidates: []
    });

    nextLine.text = composeDraftText(nextLine);
    nextLine.createForm = buildCreateForm(nextLine);
    draftLines[lineIndex] = nextLine;

    const draftState = buildDraftState(draftLines);
    this.setData({
      draftLines,
      hasDraftLines: draftState.hasDraftLines,
      pendingCount: draftState.pendingCount
    });

    this.sendAiRequest({
      latestInput: '我已选择候选物资 ' + option.name + '，请基于最新草稿继续处理。',
      userMessageText: '我已选择 ' + option.name,
      appendUserMessage: true,
      draftLinesOverride: draftLines,
      pendingActionOverride: null
    });
  },

  async createItemFromDraft(event) {
    const lineIndex = Number(event.currentTarget.dataset.lineIndex);
    const line = this.data.draftLines[lineIndex];

    if (!line || !line.createForm) {
      return;
    }

    const form = line.createForm;
    if (!`${form.name || ''}`.trim() || !`${form.category || ''}`.trim() || !`${form.unit || ''}`.trim()) {
      wx.showToast({
        title: '请填写完整的新建物资信息',
        icon: 'none'
      });
      return;
    }

    try {
      const item = await store.createStockItem({
        name: form.name,
        category: form.category,
        spec: form.spec,
        unit: form.unit,
        location: form.location,
        stock: form.stock,
        minStock: form.minStock,
        isHazardous: form.isHazardous,
        hazardType: form.hazardType
      });

      const catalog = await this.refreshCatalog();
      const draftLines = this.data.draftLines.slice();
      const nextLine = Object.assign({}, line, {
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        status: 'confirmed',
        selectionHint: '',
        candidates: [],
        createSuggestion: null
      });

      nextLine.text = composeDraftText(nextLine);
      nextLine.createForm = buildCreateForm(nextLine);
      draftLines[lineIndex] = nextLine;

      const draftState = buildDraftState(draftLines);
      this.setData({
        draftLines,
        hasDraftLines: draftState.hasDraftLines,
        pendingCount: draftState.pendingCount
      });

      await this.sendAiRequest({
        latestInput: '我已新建物资 ' + item.name + '，请基于最新草稿继续处理。',
        userMessageText: '我已新建物资 ' + item.name,
        appendUserMessage: true,
        draftLinesOverride: draftLines,
        catalogOverride: catalog,
        pendingActionOverride: null
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '鏂板缓鐗╄祫澶辫触',
        icon: 'none'
      });
    }
  },

  async confirmAction() {
    const action = this.data.pendingAction;
    if (!action || this.data.confirming) {
      return;
    }

    if (action.requiresOperator && !(this.data.operatorName || '').trim()) {
      wx.showToast({
        title: '请先填写操作人',
        icon: 'none'
      });
      return;
    }

    this.setData({
      confirming: true
    });

    try {
      const operatorName = (this.data.operatorName || '').trim();
      const confirmedAt = getNow();
      const draftLinesSnapshot = this.data.draftLines.slice();
      const beforeCatalog = (await this.ensureCatalog()).map((item) => Object.assign({}, item));
      const confirmedMessages = this.data.messages.map((message) => {
        if (message.id !== action.messageId) {
          return message;
        }

        return Object.assign({}, message, {
          completed: true,
          completionNote: action.type === 'movement_confirm' ? '出入库操作已确认并写入库存。' : (action.type === 'stocktake_confirm' ? '盘点差异已确认，库存已更新。' : '预警值调整已确认并写入库存。')
        });
      });

      if (action.type === 'movement_confirm') {
        await store.applyDraftMovements(this.data.draftLines, {
          operator: operatorName,
          date: confirmedAt
        });
      } else if (action.type === 'stocktake_confirm') {
        await store.applyStocktakeAdjustments(action.items, {
          operator: operatorName,
          date: confirmedAt
        });
      } else if (action.type === 'threshold_confirm') {
        await store.applyThresholdUpdates(action.items, {
          operator: operatorName,
          date: confirmedAt
        });
      } else {
        throw new Error('当前待确认操作类型不支持执行');
      }

      const nextCatalog = await this.refreshCatalog();
      const operationInventoryCard = buildOperationInventoryCard(action, draftLinesSnapshot, beforeCatalog, nextCatalog);
      const nextMessages = operationInventoryCard
        ? confirmedMessages.concat(createResultCardMessage(operationInventoryCard))
        : confirmedMessages;
      this.setData({
        messages: nextMessages,
        draftLines: [],
        operatorName: '',
        hasDraftLines: false,
        pendingCount: 0,
        pendingAction: null
      });

      await this.sendAiRequest({
        latestInput: action.type === 'movement_confirm'
          ? '我已确认执行上述出入库操作，请继续返回最新状态。'
          : (action.type === 'stocktake_confirm'
            ? '我已确认执行上述盘点调整，请继续返回最新状态。'
            : '我已确认执行上述预警值调整，请继续返回最新状态。'),
        userMessageText: action.type === 'movement_confirm'
          ? '我已确认执行上述出入库操作'
          : (action.type === 'stocktake_confirm' ? '我已确认执行上述盘点调整' : '我已确认执行上述预警值调整'),
        appendUserMessage: true,
        draftLinesOverride: [],
        pendingActionOverride: null,
        catalogOverride: nextCatalog,
        ignoreResultCards: true
      });

      wx.showToast({
        title: '操作已确认',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '确认执行失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        confirming: false
      });
    }
  }
});
