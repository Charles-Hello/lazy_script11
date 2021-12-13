const Template = require('../base/template');

const {sleep, writeFileJSON} = require('../../lib/common');

const defaultApiNames = {
  getTaskList: 'interact_template_getHomeData',
  doTask: 'harmony_collectScore',
  doWaitTask: 'harmony_collectScore',
  doRedeem: 'interact_template_getLotteryResult',
};

class HarmonyTemplate extends Template {
  static scriptName = 'HarmonyTemplate';
  static times = 2;
  static isWh5 = true;
  static shareCodeTaskList = [];
  static commonParamFn = () => ({appId: 'appId'});
  static skipTaskIds = [8/*开会员*/];
  static shareTaskId = 6;
  static redeemWithTaskId = false;

  static apiNames = {};

  static shareCodeUniqIteratee = 'taskToken';

  static getApiNames() {
    return this._.assign({}, defaultApiNames, this.apiNames);
  };

  static async beforeDoTask(api, taskId) {}

  static async afterDoTask(api, data) {}

  static async afterDoWaitTask(api, data) {}

  static async afterGetTaskList(api, data) {}

  static logAfterRedeem(data) {
    const self = this;

    // 豆豆
    const quantity = _.property('data.result.userAwardsCacheDto.jBeanAwardVo.quantity')(data);
    quantity && self.log(`获取豆豆: ${quantity}`);

    // 红包
    const value = _.property('data.result.userAwardsCacheDto.redPacketVO.value')(data);
    value && self.log(`获取红包: ${value}`);
  }

  static apiNamesFn() {
    const self = this;

    const result = {
      // 获取任务列表
      getTaskList: {
        name: self.getApiNames().getTaskList,
        paramFn: self.commonParamFn,
        successFn: async (data, api) => {

          if (!self.isSuccess(data)) {
            api.log(`活动异常 ${JSON.stringify(data)}`);
            return [];
          }

          const result = [];

          for (const task of _.property('data.result.taskVos')(data) || []) {
            let {
              subTitleName = '',
              status,
              taskId,
              maxTimes,
              times,
              waitDuration,
            } = task;
            if (self.redeemWithTaskId && status === 3/*待抽奖*/) {
              await api.doFormBody(self.getApiNames().doRedeem, {taskId, ...self.commonParamFn()}).then(self.logAfterRedeem.bind(self));
              continue;
            }

            if ([2, 3/*待抽奖*/, 4].includes(status) || self.skipTaskIds.includes(taskId)) continue;

            await self.beforeDoTask(api, taskId);

            waitDuration = waitDuration || +(_.last(/(\d*)[s|秒]/.exec(subTitleName)) || 0);

            let list = self.getListMatchVo(task);

            // 邀请助力
            if (taskId === self.shareTaskId) {
              if (self.doneShareTask) {
                continue;
              }
              self.updateShareCodeFn(list[0], true);
              list = self.getShareCodeFn();
              times = 0;
              maxTimes = list.length;
            }

            list = list.filter(o => o.status !== 2).map(o => _.assign({
              taskId,
              actionType: waitDuration ? 1 : 0,
            }, _.pick(o, ['itemId', 'taskToken']), self.commonParamFn()));

            if (list.length < maxTimes) {
              times = 0;
              maxTimes = list.length;
            }

            result.push({list, option: {maxTimes, times, waitDuration}});
          }

          return result;
        },
      },
      doTask: {
        name: self.getApiNames().doTask,
        paramFn: o => o,
        async successFn(data, api) {
          // 增加点延迟
          await sleep();
          await self.afterDoTask(api, data);
        },
      },
      doWaitTask: {
        name: self.getApiNames().doWaitTask,
        paramFn: o => _.assign(o, {actionType: 0}),
        successFn(data, api) {
          return self.afterDoWaitTask(api, data);
        },
      },
      afterGetTaskList: {
        name: self.getApiNames().afterGetTaskList,
        paramFn: self.commonParamFn,
        async successFn(data, api) {
          if (!self.isSuccess(data)) return false;
          await self.afterGetTaskList(api, data);
        },
      },
      doRedeem: {
        name: self.getApiNames().doRedeem,
        paramFn: self.commonParamFn,
        successFn: data => {
          if (!self.isSuccess(data)) return false;
          self.logAfterRedeem(data);
        },
        repeat: true,
      },
    };

    Object.keys(result).forEach(key => {
      if (!self.apiNames[key]) delete result[key];
    });

    return result;
  };
}

module.exports = HarmonyTemplate;
