const Base = require('./index');

const {sleep, writeFileJSON} = require('../../lib/common');

class Template extends Base {
  static scriptName = 'Template';
  static times = 2;
  static shareCodeTaskList = [];
  static maxTaskDoneTimes = 1;

  static updateShareCodeFn(shareCode) {
    const self = this;
    const shareCodeTaskList = self.shareCodeTaskList;
    if (!shareCodeTaskList.includes(shareCode)) {
      shareCodeTaskList.splice(self.currentCookieTimes, 0, shareCode);
    }
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
    shareCodes.forEach(code => {
      if (self.shareCodeTaskList.includes(code)) return;
      self.shareCodeTaskList.push(code);
    });
  }

  static async beforeRequest(api) {
  }

  // doMain一般不会被重载
  static async doMain(api, shareCodes) {
    const self = this;
    const _ = this._;

    self.initShareCodeTaskList(shareCodes || []);

    await self.beforeRequest(api);
    await self.doApi(api, 'beforeGetTaskList');

    let taskDoneTimes = 0;
    await _doTask();

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

    if (self.isLastLoop()) {
      await self.doApi(api, 'afterGetTaskList');
      await self.doApi(api, 'doRedeem');
    }
  }
}

module.exports = Template;
