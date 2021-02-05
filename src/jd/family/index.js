const Template = require('../base/template');

const {sleep, writeFileJSON, getNowMoment} = require('../../lib/common');
const moment = require('moment-timezone');
const _ = require('lodash');

const defaultApiNames = {
  getTaskList: 'family_query',
  doTask: 'family_task',
  afterGetTaskList: 'family_query',
};

class Family extends Template {
  static scriptName = 'Family';
  static scriptNameDesc = '家庭号';
  static shareCodeTaskList = [];
  static times = 1;
  // static needInApp = false;
  // static needInPhone = true;
  static commonParamFn = () => ({});
  static apiNames = {};

  static getTaskList({taskid, tasktype}) {
    if ([5].includes(tasktype)) return [];
    let item = {taskid};
    let list = [item];
    if (tasktype === 2) {
      item['callback'] = 'CheckParamsF';
    }
    if (taskid === '5fed97ce5da81a8c069810df' && getNowMoment().hour() < 8) {
      for (let i = 0; i < 60; i++) {
        list.push(item);
      }
    }
    return list;
  }

  static getApiNames() {
    const assign = _.assign({}, defaultApiNames, this.apiNames);
    return assign;
  };

  static customApiOptions = {
    qs: {
      activeid: '10081245',
      token: '77a482ad11bd58240dc2871fa8d75602',
    },
    headers: {
      referer: 'https://lgame.jd.com/babelDiy/Zeus/2ZpHzZdUuvWxMJT4KXuRdK6NPj3D/index.html',
    },
  };

  static apiOptions() {
    return {
      formatDataFn(data) {
        let result = {};
        try {
          result = JSON.parse(data.replace(/try{ \w*\(/, '').replace(');}catch(e){}', ''));
        } catch (e) {
        }
        return result;
      },
      options: _.merge({
        uri: 'https://wq.jd.com/activep3/family',
        qs: {
          sceneval: 2, // app 参数
          callback: 'CheckParamsP',
        },
        method: 'GET',
      }, this.customApiOptions),
    };
  };

  static apiExtends = {
    requestFnName: 'doPath',
  };

  static isSuccess(data) {
    return !this._.isEmpty(data);
  }

  static apiNamesFn() {
    const self = this;
    const _ = this._;

    return {
      // 获取任务列表
      getTaskList: {
        name: self.getApiNames().getTaskList,
        paramFn: self.commonParamFn,
        async successFn(data, api) {
          // writeFileJSON(data, 'family_query.json', __dirname);

          if (!self.isSuccess(data)) return [];

          const result = [];

          const taskList = _.property('tasklist')(data) || [];
          for (let {
            isdo,
            taskid,
            tasktype,
            times,
          } of taskList) {
            // tasktype 2 做美食
            // tasktype 5 忽略
            if (isdo === 0 || times !== 0 || [].includes(tasktype)) continue;
            let list = self.getTaskList({taskid, tasktype});

            result.push({list, option: {maxTimes: list.length, times: 0, waitDuration: 0}});
          }

          return result;
        },
      },
      doTask: {
        name: self.getApiNames().doTask,
        paramFn: qs => [void 0, {qs}],
      },
      afterGetTaskList: {
        name: self.getApiNames().afterGetTaskList,
        async successFn(data, api) {
          if (!self.isSuccess(data)) return false;
          self.log(`当前分数为: ${data.tatalprofits}`);
        },
      },
    };
  };
}

module.exports = Family;
