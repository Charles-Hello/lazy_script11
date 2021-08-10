const Base = require('./index');

const {sleep, writeFileJSON} = require('../../lib/common');

class Template extends Base {
  static scriptName = 'Template';
  static dirname = __dirname;
  static times = 2;
  static shareCodeTaskList = [];
  // 更新助力码时使用, 一般用于区分Object
  static shareCodeUniqIteratee;
  // 默认助力码
  static defaultShareCodes = [];
  static maxTaskDoneTimes = 1;
  static doneShareTask = !this.firstTimeInTheDay();

  static updateShareCodeFn(shareCode, isCurrent = true) {
    const self = this;
    const shareCodeTaskList = self.shareCodeTaskList;
    shareCodeTaskList.splice(isCurrent ? self.currentCookieTimes : shareCodeTaskList.length, 0, shareCode);
    self.shareCodeTaskList = _.uniqBy(shareCodeTaskList, self.shareCodeUniqIteratee);
  }

  // 获取 shareCode
  static getShareCodeFn() {
    const self = this;
    return self.shareCodeTaskList.filter((o, index) => {
      if (self.isFirstLoop()) {
        return index < self.currentCookieTimes;
      }
      if (self.isLastLoop()) {
        return index > self.currentCookieTimes;
      }
    });
  }

  static apiOptions = {
    formatDataFn: data => data,
  };

  static apiNamesFn() {
    const self = this;
    const _ = this._;

    return {
      // 获取任务列表
      getTaskList: {
        name: 'getTaskList',
        paramFn: _.noop,
        successFn: _.noop,
      },
      // 做任务
      doTask: {
        name: 'doTask',
        paramFn: _.noop,
        successFn: _.noop,
      },
      doWaitTask: {
        name: 'doWaitTask',
      },
      // 任务之后, 一般来说是兑换之类的
      doRedeem: {
        name: 'doRedeem',
        paramFn: _.noop,
        successFn: _.noop,
        repeat: true,
      },
    };
  }

  static initShareCodeTaskList(shareCodes) {
    const self = this;
    // 通用处理
    shareCodes.concat(self.defaultShareCodes).forEach((code, index) => {
      self.updateShareCodeFn(code, index === 0);
    });
    self.defaultShareCodes = [];
  }

  static async beforeRequest(api) {
  }

  static async handleUpdateCurrentShareCode(api) {}

  static async handleDoShare(api) {}

  // doMain一般不会被重载
  static async doMain(api, shareCodes) {
    const self = this;

    self.initShareCodeTaskList(shareCodes || []);

    const needStop = await self.beforeRequest(api);
    if (needStop === true) return api.log('活动已结束(beforeRequest)');

    await self.doApi(api, 'beforeGetTaskList');

    if (!self.doneShareTask) {
      self.isFirstLoop() && await self.handleUpdateCurrentShareCode(api);
      await self.handleDoShare(api);
    }

    let taskDoneTimes = 0;
    await _doTask();

    if (self.isLastLoop()) {
      await self.doApi(api, 'afterGetTaskList');
      await self.doApi(api, 'doRedeem');
    }

    async function _doTask() {
      const taskList = await self.doApi(api, 'getTaskList') || [];

      let isDone = false;
      for (const {list, option = {}} of taskList) {
        option.firstFn = option.firstFn || (item => self.doApi(api, 'doTask', item));
        option.afterWaitFn = option.afterWaitFn || ((data, item) => {
          return self.doApi(api, 'doWaitTask', item, data);
        });
        if (await self.loopCall(list, option)) {
          isDone = true;
        }
      }
      if (isDone && (++taskDoneTimes < self.maxTaskDoneTimes)) {
        await sleep(2);
        await _doTask();
      }
    }
  }

  // helpers
  static getFilePath(fileName) {
    return require('path').resolve(this.dirname || __dirname, fileName);
  }
}

module.exports = Template;
