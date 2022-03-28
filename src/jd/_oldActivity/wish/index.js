const Template = require('../base/template');

const {sleep, writeFileJSON} = require('../../lib/common');

const {wish} = require('../../../charles/api');

class Wish extends Template {
  static scriptName = '心愿单';
  static shareCodeTaskList = [];
  static times = 1;
  static needOriginH5 = true;

  static isSuccess(data) {
    return this._.property('code')(data) === '0';
  }

  static async doMain(api) {
    const self = this;

    async function getTaskList(roomId) {
      return api.doFormBody('getWishOrderRankingList', {
        roomId,
        monitorSource: 'wishOrderRanking_h5',
      }, {
        appid: 'haohuoh5',
        client: 'h5',
      }).then(data => {
        if (!self.isSuccess(data)) return [];
        return _.flatten(_.map(_.property('data')(data) || [], 'materialsList'))
        .filter(o => !o.followStatus && o.wishOrderJdMarkFlag/* true: 有豆 */).map(o => o.materialId);
      });
    }

    const roomIds = [
      15, // 时尚服饰
      14, // 生鲜食品
      13, // 超市百货
      17, // 护肤彩妆
      31, // 手机图书
      36, // 超市百货
    ];

    let taskList = [];
    for (const roomId of roomIds) {
      taskList = taskList.concat(await getTaskList(roomId));
    }

    // writeFileJSON(taskList, 'taskList.json', __dirname);

    function getForm(materialId) {
      return wish.wishContent.find(o => JSON.parse(o.body).contentId === materialId);
    }

    let times = 0;
    let allPrizeNum = 0;
    // 每天只有10次机会
    const maxTimes = 10;
    let index = 0;
    for (; ;) {
      let form;
      do {
        const materialId = taskList[index++];
        if (!materialId) break;
        form = getForm(materialId);
      } while (!form);

      if (!form) break;

      const needStop = await api.doForm('wishContent', form).then(async data => {
        index++;
        if (!self.isSuccess(data)) {
          api.log(data.msg);
          return true;
        }
        if (data.prizeInfo) {
          const prizeNum = _.property('prizeInfo.prizeNum')(data);
          if (prizeNum === 0) {
            api.log(data.prizeInfo.msg);
            return true;
          } else {
            allPrizeNum += prizeNum;
            times++;
          }
        }
      });
      if (needStop) break;
    }

    allPrizeNum && api.log(`领取到的京豆为: ${allPrizeNum}`);
  };
}

module.exports = Wish;
