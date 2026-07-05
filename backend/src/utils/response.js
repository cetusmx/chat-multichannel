function success(res, data, status = 200) {
  return res.status(status).json({ data });
}

function created(res, data) {
  return success(res, data, 201);
}

function noContent(res) {
  return res.status(204).end();
}

function list(res, items, meta = {}) {
  return res.status(200).json({ data: items, meta });
}

function error(res, message, code = 'INTERNAL_ERROR', status = 500) {
  return res.status(status).json({ error: { message, code } });
}

module.exports = { success, created, noContent, list, error };
