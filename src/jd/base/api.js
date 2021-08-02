/**
 * @description 通用方法
 *
 */

const Cookie = require('../../lib/cookie');

/**
 * @description 获取随机的uuid
 * @return {string}
 */
function uuidRandom() {
  return Math.random().toString(16).slice(2, 10) +
    Math.random().toString(16).slice(2, 10) +
    Math.random().toString(16).slice(2, 10) +
    Math.random().toString(16).slice(2, 10) +
    Math.random().toString(16).slice(2, 10);
}

async function getJoyToken(api, appId, updateCookie = true) {
  const joyToken = await api.doUrl('https://bh.m.jd.com/gettoken', {
    form: {
      content: {'appname': appId, 'whwswswws': '', 'jdkey': '', 'body': {'platform': '1'}},
    },
    headers: {
      cookie: '',
    },
  }).then(data => {
    return data['joyytoken'];
  });
  if (!updateCookie) return joyToken;

  const newCookie = `joyytoken=${appId}${joyToken}`;
  api.cookie = new Cookie([api.cookie, newCookie].join('; ')).toString();
  return joyToken;
}

module.exports = {
  uuidRandom,
  getJoyToken,
};
