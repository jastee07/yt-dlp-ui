function nowIso() {
  return new Date().toISOString();
}

function createLifecycleTracker() {
  const entries = [];

  function add(state, extra = {}) {
    const entry = { state, at: nowIso(), ...extra };
    entries.push(entry);
    return entry;
  }

  function list() {
    return entries.slice();
  }

  return { add, list };
}

module.exports = { createLifecycleTracker };
