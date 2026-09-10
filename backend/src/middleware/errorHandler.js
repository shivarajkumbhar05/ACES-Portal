function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', detail: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid identifier supplied' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.publicMessage || 'Internal server error' });
}

function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

module.exports = { asyncHandler, errorHandler, notFound };
