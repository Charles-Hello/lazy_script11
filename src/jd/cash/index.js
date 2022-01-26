const Template = require('../base/template');

const {sleep, writeFileJSON} = require('../../lib/common');
const _ = require('lodash');

const {cash} = require('../../../charles/api');

function findFormData(allBody, allForm) {
  return allForm.find(form => {
    return allBody.find(body => _.isEqual(body, JSON.parse(form.body)));
  });
}

class Cash extends Template {
  static scriptName = 'Cash';
  static scriptNameDesc = '领现金';
  static shareCodeTaskList = [];
  static maxTaskDoneTimes = 2;
  static times = 2;
  static needOriginH5 = true;

  static apiNamesFn() {
    const self = this;

    return {
      // 获取任务列表
      getTaskList: {
        name: 'cash_homePage',
        paramFn: () => [{}, cash.cash_homePage[0]],
        successFn: async (data, api) => {
          // writeFileJSON(data, 'cash_homePage.json', __dirname);

          if (!self.isSuccess(data)) return [];

          const result = [];

          // 先签到
          if (data.data.result.signedStatus === 2) {
            const signForm = cash.cash_sign.find(form => JSON.parse(form.body).inviteCode === self.shareCodeTaskList[0]) || cash.cash_sign[0];
            await api.doForm('cash_sign', signForm);
            return;
          }

          const taskList = _.property('data.result.taskInfos')(data) || [];
          for (let {
            finishFlag: status,
            name,
            times: maxTimes,
            doTimes: times,
            duration: waitDuration,
            desc,
            doTaskDesc,
            type,
          } of taskList) {
            if (status === 1 || ['京喜双签', '金融双签', 'APP签到提醒', '健康双签'].includes(name) || name.match('邀好友')) continue;

            let list = [];

            const body = {taskInfo: desc || doTaskDesc, type};
            const targetForm = findFormData([body], [].concat(cash.cash_doTask));
            if (targetForm) {
              list.push(targetForm);
            } else {
              list.push({body, appid: 'CashReward'});
            }

            // 每种类型的任务只做一个
            !_.isEmpty(list) && result.push({list});
          }

          return result;
        },
      },
      doTask: {
        name: 'cash_doTask',
        paramFn: form => {
          return [{}, form];
        },
      },
      doRedeem: {
        name: 'cash_homePage',
        paramFn: () => [{}, cash.cash_homePage[0]],
        successFn: async data => {
          self.log(`目前总额为: ${data.data.result.totalMoney}`);
        },
      },
    };
  };
}

module.exports = Cash;
