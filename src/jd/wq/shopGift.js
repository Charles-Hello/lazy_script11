const Template = require('./index');

const path = require('path');
const fs = require('fs');
const {sleep, writeFileJSON, singleRun, getRealUrl, getUrlDataFromFile} = require('../../lib/common');
const _ = require('lodash');
const shopGiftUrlPath = path.resolve(__dirname, 'shopGift.url');

class ShopGift extends Template {
  static scriptName = 'ShopGift';
  static scriptNameDesc = '店铺(web)-收藏有礼';
  static concurrent = true;

  static customApiOptions = {
    uri: 'https://wq.jd.com/fav_snsgift',
    headers: {
      referer: 'https://shop.m.jd.com/',
    },
    qs: {
      sceneval: 2,
    },
  };

  static async doMain(api) {
    const self = this;
    const doPath = (functionId, qs) => api.doPath(functionId, void 0, {qs});

    const urls = getUrlDataFromFile(shopGiftUrlPath);
    for (const url of urls) {
      const realUrl = await getRealUrl(url);
      const shopId = new URL(realUrl).searchParams.get('shopId');
      await getGif(shopId);
    }

    async function getGif(shopId) {
      const venderId = await getVenderId(shopId);
      if (!venderId) return api.log(`${shopId} 不存在`);
      const {giftId, activeId, jingBean} = await doPath('QueryShopActive', {venderId}).then(data => {
        return (data['gift'] || []).find(o => o['giftType'] === 0 && o['state'] === 1) || {};
      });

      if (!giftId) return api.log(`${shopId} 没有关注礼包`);
      if (!jingBean) return api.log(`${shopId} 没有豆豆礼包`);

      await api.delFavShop(shopId);
      await doPath('addfavgiftshop', {venderId});
      await doPath('GiveShopGift', {venderId, giftId, activeId}).then(data => {
        if (data['retCode'] !== 0) return api.log(`${shopId} errMsg: ${data['errMsg']}`);
        api.log(`${shopId} 获取到豆豆: ${jingBean['sendCount']}`);
      });
      await api.delFavShop(shopId);
    }

    async function getVenderId(shopId) {
      if (!shopId) return;
      return api.commonDo({
        uri: 'https://shop.m.jd.com',
        qs: {shopId},
        ignorePrintLog: true,
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        },
      }).then(data => {
        if (!_.isString(data)) return;
        const match = data.match(/venderId\s*:\s*['"]\w*['"]/);
        if (!match) return;
        return match[0].replace(/venderId\s*:\s*['"]/, '').replace(/['"]/, '');
      });
    }
  }
}

singleRun(ShopGift).then(() => {
  fs.writeFileSync(shopGiftUrlPath, '');
});

module.exports = ShopGift;
