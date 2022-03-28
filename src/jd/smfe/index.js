const Template = require('../base/template');

const {sleep, writeFileJSON} = require('../../lib/common');

class Smfe extends Template {
  static scriptName = 'Smfe';
  static scriptNameDesc = '小魔方';
  static shareCodeTaskList = [];
  static commonParamFn = () => ({interactionId: this.interactionId});
  static times = 1;

  static apiOptions = {
    signData: {
      appid: 'smfe',
    },
  };

  static isSuccess(data) {
    return this._.property('result.code')(data) === 0;
  }

  static apiNamesFn() {
    const self = this;

    return {
      // 获取任务列表
      getTaskList: {
        name: 'getNewsInteractionInfo',
        paramFn: self.commonParamFn,
        successFn: async (data, api) => {
          // writeFileJSON(data, 'getNewsInteractionInfo.json', __dirname);

          if (!self.isSuccess(data)) return [];

          const result = [];

          const taskList = _.property('result.taskPoolInfo.taskList')(data) || [];
          const interactionId = _.property('result.interactionId')(data);
          self.interactionId = interactionId;
          const taskPoolId = _.property('result.taskPoolInfo.taskPoolId')(data);

          for (let {
            taskStatus: status,
            taskId,
            maxTimes,
            times,
            waitDuration,
          } of taskList) {
            if (status === 1 || [].includes(taskId)) continue;

            let list = [];
            const option = {maxTimes, times, waitDuration};
            [
              [1, 'signNewsInteraction', [{}]],
              [4, 'viewNewsInteractionSkus', data.result.taskSkuInfo],
              [6, 'executeInteractionTask', [{}]],
              [7, 'executeInteractionTask', data.result.shopInfoList],
              [9, 'executeInteractionTask', [{}]],
            ].forEach(([id, functionId, _list]) => {
              if (taskId === id) {
                list = _list.map(o => {
                  [6, 7, 9].includes(id) && (o.taskType = id);
                  return o;
                }).filter(o => o.browseStatus !== 1);
                _.assign(option, {
                  firstFn: async (o) => {
                    const body = _.assign({
                      interactionId,
                      taskPoolId,
                    }, _.pick(o, ['skuId', 'shopId', 'taskType']));
                    body.skuId && (body.sku = body.skuId);
                    await api.doFormBody(functionId, body);
                  },
                  maxTimes: list.length,
                });
              }
            });

            result.push({list, option});
          }

          return result;
        },
      },
      doRedeem: {
        repeat: true,
        name: 'getNewsInteractionLotteryInfo',
        paramFn: self.commonParamFn,
        async successFn(data) {
          if (!self.isSuccess(data)) return false;
          const {isLottery, lotteryInfo, lotteryNum} = data.result;
          isLottery && api.log(`${lotteryInfo.name}: ${lotteryInfo.quantity}`);
          if (lotteryNum === 0) return false;
        },
      },
    };
  };

  static initShareCodeTaskList(shareCodes) {
    // 处理
  }
}

module.exports = Smfe;
