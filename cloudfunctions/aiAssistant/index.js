const config = require('./config');
const http = require('http');
const https = require('https');
const { URL } = require('url');

function createDraftId(index) {
  return `draft-${Date.now()}-${index}`;
}

function normalizeCandidate(candidate) {
  return {
    itemId: candidate.itemId || candidate.id || '',
    name: candidate.name || '',
    category: candidate.category || '',
    spec: candidate.spec || '',
    unit: candidate.unit || '',
    location: candidate.location || '',
    reason: candidate.reason || ''
  };
}

function normalizeDraftLine(line, index) {
  const candidates = Array.isArray(line.candidates) ? line.candidates.map(normalizeCandidate) : [];
  const quantity = Number(line.quantity);
  const itemId = line.itemId || '';
  const hasCreateSuggestion = !!line.createSuggestion;
  const status = line.status === 'needs_create' || (!itemId && hasCreateSuggestion && !candidates.length)
    ? 'needs_create'
    : line.status === 'needs_selection' || !itemId
      ? 'needs_selection'
      : 'confirmed';

  return {
    draftId: line.draftId || createDraftId(index),
    text: line.text || '',
    type: line.type === '入库' || line.type === '出库' ? line.type : '',
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unit: line.unit || '',
    itemId,
    itemName: line.itemName || '',
    remark: line.remark || '',
    status,
    selectionHint: line.selectionHint || '',
    candidates,
    createSuggestion: line.createSuggestion || null
  };
}

function normalizeResultCard(card) {
  const items = Array.isArray(card.items)
    ? card.items
    : card.items && typeof card.items === 'object'
      ? [card.items]
      : [];

  return {
    cardType: card.cardType || 'inventory_query',
    title: card.title || '库存结果',
    summary: card.summary || '',
    items: items
      .map((item) => ({
          itemId: item.itemId || item.id || '',
          name: item.name || item.itemName || '',
          stock: Number(item.stock || 0),
          beforeStock: item.beforeStock !== undefined && item.beforeStock !== null ? Number(item.beforeStock) : null,
          minStock: item.minStock !== undefined && item.minStock !== null ? Number(item.minStock) : null,
          beforeMinStock: item.beforeMinStock !== undefined && item.beforeMinStock !== null ? Number(item.beforeMinStock) : null,
          unit: item.unit || '',
          spec: item.spec || '',
          location: item.location || ''
        }))
  };
}

function normalizePendingAction(action) {
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
    title: action.title || '待确认操作',
    summary: action.summary || '',
    buttonText: action.buttonText || '确认执行',
    requiresOperator: action.requiresOperator !== false,
    items: Array.isArray(action.items)
      ? action.items.map((item) => {
          const quantity = Number(item.quantity);
          const currentQuantity = Number(item.currentQuantity);
          const countedQuantity = Number(item.countedQuantity);
          const difference = Number(item.difference);
          const currentMinStock = Number(item.currentMinStock);
          const minStock = Number(item.minStock);

          return {
            type: item.type === '入库' || item.type === '出库' ? item.type : '',
            itemId: item.itemId || item.id || '',
            itemName: item.itemName || item.name || '',
            unit: item.unit || '',
            quantity: Number.isFinite(quantity) ? quantity : 0,
            currentQuantity: Number.isFinite(currentQuantity) ? currentQuantity : 0,
            countedQuantity: Number.isFinite(countedQuantity) ? countedQuantity : 0,
            difference: Number.isFinite(difference) ? difference : 0,
            currentMinStock: Number.isFinite(currentMinStock) ? currentMinStock : 0,
            minStock: Number.isFinite(minStock) ? minStock : 0,
            remark: item.remark || ''
          };
        })
      : []
  };
}

function validateConfig() {
  const api = config.api || {};
  if (!api.baseURL || api.baseURL.includes('your-openai-compatible-host')) {
    throw new Error('请先在云函数环境变量中配置 AI_BASE_URL。');
  }

  if (!api.apiKey) {
    throw new Error('请先在云函数环境变量中配置 AI_API_KEY。');
  }

  if (!api.model || api.model === 'your-model-name') {
    throw new Error('请先在云函数环境变量中配置 AI_MODEL。');
  }
}

function extractJson(text) {
  const trimmed = `${text || ''}`.trim();
  if (!trimmed) {
    throw new Error('AI 未返回有效内容。');
  }

  const candidate = trimmed.startsWith('{') && trimmed.endsWith('}')
    ? trimmed
    : (() => {
        const fenceRemoved = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        const firstBrace = fenceRemoved.indexOf('{');
        const lastBrace = fenceRemoved.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
          throw new Error(`AI 返回内容不是合法 JSON：${trimmed.slice(0, 160)}`);
        }
        return fenceRemoved.slice(firstBrace, lastBrace + 1);
      })();

  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new Error(`AI 返回内容不是合法 JSON：${error.message}`);
  }
}

function resolveEndpoint(baseURL) {
  const normalized = `${baseURL || ''}`.replace(/\/$/, '');
  return normalized.endsWith('/chat/completions') ? normalized : `${normalized}/chat/completions`;
}

function extractMessageContent(payload) {
  const content = payload
    && payload.choices
    && payload.choices[0]
    && payload.choices[0].message
    && payload.choices[0].message.content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) {
          return '';
        }
        if (typeof part === 'string') {
          return part;
        }
        return typeof part.text === 'string' ? part.text : '';
      })
      .join('');
  }

  return `${content || ''}`;
}

async function requestCompletion(messages) {
  const api = config.api;
  const endpoint = new URL(resolveEndpoint(api.baseURL));
  const transport = endpoint.protocol === 'http:' ? http : https;
  const body = JSON.stringify({
    model: api.model,
    temperature: api.temperature,
    response_format: {
      type: 'json_object'
    },
    messages
  });

  const payload = await new Promise((resolve, reject) => {
    const request = transport.request(
      {
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        port: endpoint.port || (endpoint.protocol === 'http:' ? 80 : 443),
        path: `${endpoint.pathname}${endpoint.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Bearer ${api.apiKey}`
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
            reject(new Error(`模型接口调用失败：${statusCode} ${responseText}`));
            return;
          }

          try {
            resolve(JSON.parse(responseText));
          } catch (error) {
            reject(new Error(`模型接口返回了非 JSON 内容：${responseText}`));
          }
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(api.timeoutMs || 60000, () => {
      request.destroy(new Error('模型接口请求超时'));
    });

    request.write(body);
    request.end();
  });

  return extractJson(extractMessageContent(payload));
}

exports.main = async (event) => {
  try {
    validateConfig();

    const result = await requestCompletion([
      {
        role: 'system',
        content: config.prompt.system
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            latestInput: `${event.latestInput || ''}`.trim(),
            currentDraftLines: Array.isArray(event.draftLines) ? event.draftLines : [],
            pendingAction: event.pendingAction || null,
            catalog: Array.isArray(event.catalog) ? event.catalog : []
          },
          null,
          2
        )
      }
    ]);

    const draftLines = Array.isArray(result.draftLines) ? result.draftLines.map((line, index) => normalizeDraftLine(line, index)) : [];
    const rawResultCards = Array.isArray(result.resultCards)
      ? result.resultCards
      : (result.resultCards && typeof result.resultCards === 'object' ? [result.resultCards] : []);
    const resultCards = rawResultCards.map(normalizeResultCard);
    const pendingAction = normalizePendingAction(result.pendingAction);
    const assistantReply = `${result.assistantReply || ''}`.trim();

    if (!assistantReply) {
      throw new Error('AI 返回格式不完整，缺少 assistantReply。');
    }

    return {
      success: true,
      data: {
        assistantReply,
        draftLines,
        resultCards,
        pendingAction
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'AI 助手云函数执行失败'
    };
  }
};
