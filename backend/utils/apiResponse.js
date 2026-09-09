function success(res, data = {}, message = 'Operation successful', statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, message });
}

function error(res, message = 'Something went wrong', statusCode = 400, code = 'ERROR') {
  return res.status(statusCode).json({ success: false, message, code });
}

module.exports = { success, error };
