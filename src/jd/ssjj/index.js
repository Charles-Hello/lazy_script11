const Template = require('../base/template');

const {sleep, writeFileJSON} = require('../../lib/common');

const commonOptions = {
  headers: {
    token: '',
  },
};

class Ssjj extends Template {
  static scriptName = 'Ssjj';
  static shareCodeTaskList = [];
  static commonParamFn = () => [void 0, commonOptions];
  static times = 2;

  static apiOptions = {
    options: {
      uri: 'https://lkyl.dianpusoft.cn/api',
      method: 'GET',
    },
  };
  static apiExtends = {
    // 具体请求 functionName
    requestFnName: 'doPath',
    // 接口名称
    apiNames: [],
  };

  static isSuccess(data) {
    return this._.property('head.code')(data) === 200;
  }

  static async beforeInit() {
    const self = this;
    _.merge(self.apiOptions, {
      options: {
        headers: {
          // token: self.getCurrentEnv('JD_SSJJ_TOKEN'),
        },
      },
    });
  }

  static apiNamesFn() {
    const self = this;

    return {
      beforeGetTaskList: {
        name: 'user-info/login',
        paramFn: () => [void 0, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {'body': {'client': 2, 'userName': self.getCurrentEnv('JD_SSJJ_USER_NAME')}},
        }],
        async successFn(data) {
          if (!self.isSuccess(data)) return;
          commonOptions.headers.token = data.head.token;
        },
      },
      // 获取任务列表
      getTaskList: {
        name: 'ssjj-task-info/queryAllTaskInfo/2',
        paramFn: self.commonParamFn,
        successFn: async (data, api) => {
          api._doPath = (functionId, options = {}) => api.doPath(functionId, void 0, this._.merge(commonOptions, options));
          // writeFileJSON(data, 'queryAllTaskInfo.json', __dirname);

          if (!self.isSuccess(data)) return [];

          const result = [];

          const taskList = _.property('body')(data) || [];
          for (let {
            doneNum: times, ssjjTaskInfo, browseId
          } of taskList) {
            const {
              id,
              awardOfDayNum: maxTimes,
              browseTime: waitDuration,
              type,
            } = ssjjTaskInfo;
            if (maxTimes === times || [
              // 1, // 邀请任务
            ].includes(type)) continue;

            let list = [];
            let option = {maxTimes, times, waitDuration};
            const task = [
              [1, 'createAssistUser'],
              [2, 'clock'],
              [4, 'followShops'],
              [5, 'browseShops'],
              [6, 'followChannel'],
              [7, 'browseChannels'],
              [9, 'purchaseCommodities'],
              [10, 'browseCommodities'],
              [11, 'browseMeetings'],
            ].find(([_type, functionId]) => _type === type);
            if (!task) continue;

            const [_type, functionId] = task;

            if (type === 1) {
              const currentShareCode = await api._doPath('ssjj-task-record/createInviteUser').then(data => data.body.id);
              !self.shareCodeTaskList.includes(currentShareCode) && self.shareCodeTaskList.push(currentShareCode);
              list = self.getShareCodeFn().map(code => ({id: code, taskId: id}));
              option.maxTimes = list.length;
              option.times = 0;
            }

            if (type === 6) {
              list = await api._doPath(`ssjj-task-channels/queryChannelsList/${id}`).then(data => data.body);
            }
            if ([4, 9].includes(type)) option.maxTimes = 1;
            option.firstFn = async o => {
              let path = `ssjj-task-record/${functionId}/${o.id || id}`;
              const taskId = o.taskId || browseId;
              taskId && (path += '/' + taskId);
              await api._doPath(path, ...self.commonParamFn());
            };

            result.push({list, option});
          }

          return result;
        },
      },
      doRedeem: {
        name: 'ssjj-draw-center/queryDraw',
        paramFn: self.commonParamFn,
        successFn: async (data, api) => {
          if (!self.isSuccess(data)) {
            self.log(data.head.msg);
            return false;
          }
          const repeat = await api._doPath(`ssjj-draw-record/draw/${data.body.center.id}`).then(self.isSuccess.bind(self));
          if (!repeat) {
            self.log('完成任务和抽奖');
            return false;
          }
        },
        repeat: true,
      },
    };
  };
}

module.exports = Ssjj;
