function normalizeConfig(raw = {}) {
  const counters = raw && typeof raw.counters === 'object' && raw.counters !== null ? raw.counters : {};

  return {
    defaultSavePath: String(raw.defaultSavePath || '').trim(),
    defaultFormat: String(raw.defaultFormat || '').trim(),
    counters,
  };
}

function applySettingsUpdate(config, updates = {}) {
  const next = normalizeConfig(config);

  if (Object.prototype.hasOwnProperty.call(updates, 'defaultSavePath')) {
    next.defaultSavePath = String(updates.defaultSavePath || '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'defaultFormat')) {
    next.defaultFormat = String(updates.defaultFormat || '').trim();
  }

  return next;
}

module.exports = { normalizeConfig, applySettingsUpdate };
