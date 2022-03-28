const Template = require('../../base/template');

const {sleep, writeFileJSON} = require('../../../lib/common');

class Nian extends Template {
  static scriptName = 'Nian';
  static scriptNameDesc = '打年兽';
  static shareCodeTaskList = [];
  static isWh5 = true;
  static commonParamFn = () => ({});

  static apiOptions = {
    signData: {},
  };

  static apiNamesFn() {
    const self = this;

    return {
      // 获取任务列表
      getTaskList: {
        name: 'nian_getTaskDetail',
        paramFn: self.commonParamFn,
        async successFn(data, api) {
          // writeFileJSON(data, 'nian_getTaskDetail.json', __dirname);

          if (!self.isSuccess(data)) return [];


          const ss = await self.getSS(api);
          self.commonParamFn = () => ss;

          const inviteId = _.property('data.result.inviteId')(data);

          const result = [];

          let taskList = _.property('data.result.taskVos')(data) || [];

          for (const {taskId} of taskList.filter(o => [101/*加购*/].includes(o.taskId) && o.status !== 2)) {
            await api.doFormBody('nian_getFeedDetail', {taskId}).then(async data => {
              const cartList = data.data.result.addProductVos;
              taskList = taskList.concat(cartList);
            });
          }

          for (let {
            status,
            taskId,
            maxTimes,
            times,
            waitDuration,
            simpleRecordInfoVo,
            shoppingActivityVos,
            browseShopVo,
            productInfoVos,
            assistTaskDetailVo
          } of taskList) {
            if (status === 2 || [7/*开会员*/, 101/*加购*/, 12, 13/*队伍*/].includes(taskId)) continue;

            let list = _.concat(simpleRecordInfoVo || shoppingActivityVos || browseShopVo || productInfoVos || []);

            if (taskId === 2/*助力*/) {
              const shareCodeTaskList = self.shareCodeTaskList;
              if (!shareCodeTaskList.includes(inviteId)) {
                shareCodeTaskList.splice(self.currentCookieTimes, 0, inviteId);
              }
              list = self.getShareCodeFn().map(inviteId => _.assign({inviteId}, assistTaskDetailVo));
              times = 0;
              maxTimes = list.length;
            }

            list = list.map(o => _.assign({
              taskId,
              actionType: waitDuration ? 1 : 0,
            }, _.pick(o, ['itemId', 'taskToken', 'inviteId']), ss));

            result.push({list, option: {maxTimes, times, waitDuration}});
          }

          return result;
        },
      },
      doTask: {
        name: 'nian_collectScore',
        paramFn: o => o,
      },
      doWaitTask: {
        name: 'nian_collectScore',
        paramFn: o => _.assign(o, {actionType: 0}),
      },
      // afterGetTaskList: {
      //   name: 'nian_collectSpecialGift',
      //   paramFn: () => _.assign({ic: 1}, self.commonParamFn()),
      // },
      doRedeem: {
        name: 'nian_raise',
        paramFn: self.commonParamFn,
        async successFn(data, api) {
          if (!self.isSuccess(data)) {
            const {
              redNum,
              scoreLevel,
            } = await self.getHomeData(api).then(data => _.property('data.result.homeMainInfo.raiseInfo')(data)) || {};
            scoreLevel && api.log(`当前等级: ${scoreLevel}, 年终奖瓜分数目: ${redNum}`);
            return false;
          }
        },
        repeat: true,
      },
    };
  };

  static initShareCodeTaskList(shareCodes) {
    const self = this;
    shareCodes.forEach(code => {
      if (self.shareCodeTaskList.includes(code)) return;
      self.shareCodeTaskList.push(code);
    });
  }

  static async getHomeData(api) {
    return api.doFormBody('nian_getHomeData');
  }

  static async getSS(api) {
    const self = this;

    const {secretp} = await this.getHomeData(api).then(data => _.property('data.result.homeMainInfo')(data) || {});
    if (api._data) return api._data;
    return api._data = {ss: JSON.stringify({secretp})};
  }

  static async doCron(api) {
    const self = this;

    await api.doFormBody('nian_collectProduceScore', await self.getSS(api)).then(data => {
      this.log(`获取到 ${_.property('data.result.produceScore')(data)}`);
    });
  }
}

module.exports = Nian;
