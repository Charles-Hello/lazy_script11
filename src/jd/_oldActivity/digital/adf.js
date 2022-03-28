const Template = require('../../base/template');

const {sleep, writeFileJSON} = require('../../../lib/common');

class Adf extends Template {
  static scriptName = 'Adf';
  static scriptNameDesc = '5折加购';
  static shareCodeTaskList = [];
  static times = 2;

  static apiOptions = {
    options: {
      uri: 'https://digital-floor.m.jd.com/adf/index',
      headers: {
        origin: 'https://prodev.m.jd.com',
        referer: 'https://prodev.m.jd.com',
      },
    },
  };

  static apiExtends = {
    requestFnName: 'doPath',
  };

  static isSuccess(data) {
    return this._.property('code')(data) === 200;
  }

  static apiNamesFn() {
    const self = this;

    const taskParamFn = o => _.pick(o, ['skuId']);
    return {
      // 获取任务列表
      getTaskList: {
        name: 'indexInfo',
        paramFn: () => [void 0, {method: 'GET'}],
        successFn: async (data, api) => {
          // writeFileJSON(data, 'indexInfo.json', __dirname);

          if (!self.isSuccess(data)) return [];
          const taskList = _.property('data')(data) || [];

          const currentShareId = await api.doPath('shareInfo').then(data => data.data.shareId);
          !self.shareCodeTaskList.includes(currentShareId) && self.shareCodeTaskList.push(currentShareId);
          const shareCodes = self.getShareCodeFn();
          for (const shareId of shareCodes) {
            await api.doPath('doSupport', {shareId}).then(() => {
              api.log('助力成功');
            });
          }

          return [{
            list: taskList,
            option: {
              waitDuration: 5,
              maxTimes: taskList.length,
            },
          }];
        },
      },
      doTask: {
        name: 'browseSku',
        paramFn: taskParamFn,
      },
      doWaitTask: {
        name: 'getPrize',
        paramFn: taskParamFn,
        successFn(data, api) {
          api.log(`获取到豆豆: ${data.data}`);
        },
      },
    };
  };

  static initShareCodeTaskList(shareCodes) {
    for (const shareCode of shareCodes || []) {
      !this.shareCodeTaskList.includes(shareCode) && this.shareCodeTaskList.push(shareCode);
    }
  }
}

module.exports = Adf;
