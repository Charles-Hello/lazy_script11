const Base = require('../base');

const {sleep, writeFileJSON} = require('../../lib/common');

let allScore = 0;

class jdFactory extends Base {
  static scriptName = 'jdFactory';
  static apiOptions = {
    options: {
      headers: {
        'User-Agent': 'jdapp',
      },
    },
    formatDataFn: data => data,
    signData: {client: 'wh5', clientVersion: '1.0.0'},
  };
  static apiExtends = {
    requestFnName: 'doFormBody',
    apiNames: [
      'jdfactory_getHomeData', /* 获取用户信息 */
      'jdfactory_getTaskDetail', /* 获取任务 */
      'jdfactory_collectScore', /* 做任务 */
      'jdfactory_collectElectricity', /* 收集电量 */
    ],
  };

  static async doMain(api, shareCodes) {
    const self = this;
    const _ = this._;

    const isSuccess = data => _.property('data.bizCode')(data) === 0;

    const collectScore = async (taskToken, waitDuration) => {
      await api.jdfactory_collectScore({taskToken, actionType: waitDuration ? 1 : 0});
      if (waitDuration) {
        await sleep(waitDuration);
        await api.jdfactory_collectScore({taskToken, actionType: 0});
      }
    };

    const activityNotStart = await api.jdfactory_getTaskDetail({}).then(async data => {
      // writeFileJSON(data, 'jdfactory_getTaskDetail.json', __dirname);

      // 不在活动期间
      if (!isSuccess(data)) return true;

      if (+_.property('data.result.userScore')(data) >= 3000000) {
        self.log('蓄电池已满，使用后才可获得更多电量哦！');
        const shareList = shareCodes.map(taskToken => ({taskToken}));
        shareList.length && await _doTask(shareList, {taskId: 2, maxTimes: 5});
        return true;
      }

      for (let {
        status,
        taskId,
        maxTimes,
        times,
        waitDuration = 0,
        simpleRecordInfoVo,
        productInfoVos,
        followShopVo,
        shoppingActivityVos,
        threeMealInfoVos,
        assistTaskDetailVo = {}
      } of _.property('data.result.taskVos')(data) || []) {
        const isShareTask = taskId === 2; /*邀请助力*/
        if (isShareTask && shareCodes) {
          await _doTask(shareCodes.map(taskToken => ({taskToken})), {taskId, maxTimes: 5});
          continue;
        }
        if (status === 2 || [7/*开会员*/].includes(taskId)) continue;

        if (taskId === 3/* 去京东首页点击“数码电器” */) {
          await api.doFormBody('queryVkComponent', {
            'componentId': '4f953e59a3af4b63b4d7c24f172db3c3',
            'taskParam': '{"actId":"8tHNdJLcqwqhkLNA8hqwNRaNu5f"}',
            'cpUid': '8tHNdJLcqwqhkLNA8hqwNRaNu5f',
            'taskSDKVersion': '1.0.3',
            'businessId': 'babel',
          });
          await sleep(2);
        }

        let taskList = simpleRecordInfoVo || productInfoVos || followShopVo || shoppingActivityVos || threeMealInfoVos;
        await _doTask(taskList, {taskId, maxTimes, times, waitDuration});
      }
    });

    async function _doTask(taskList, {taskId, maxTimes = 1, times = 0, waitDuration = 0}) {
      const isShareTask = taskId === 2; /*邀请助力*/
      for (const {status, taskToken, itemId} of _.filter([].concat(taskList))) {
        if (status === 2 || maxTimes === times) continue;
        await sleep(2);
        times++;
        await collectScore(taskToken, waitDuration).then(data => {
          const score = _.property('data.result.score')(data);
          score && (allScore += +score);
          if (isShareTask) {
            isSuccess(data) && self.log(`助力结果: ${data.data.bizMsg}`);
          }
        });
      }
    }

    if (activityNotStart) return;

    if (self.isLastLoop()) {
      allScore && self.log(`获取到的电量为 ${allScore}`);

      let userScore = 0;

      await api.jdfactory_getTaskDetail({}).then(async data => {
        userScore = +data.data.result.userScore;
        self.log(`当前电量为: ${userScore}`);
      });

      // 输出用户信息
      await api.jdfactory_getHomeData().then(data => {
        if (!isSuccess(data)) {
          this.log('获取用户信息出错');
          return;
        }
        const {
          couponCount,
          name,
          remainScore,
          useScore,
          totalScore,
        } = _.property('data.result.factoryInfo')(data) || {};
        name && self.log(`${name}现在还剩${couponCount}件, 电量还差 ${+totalScore - (+remainScore + +useScore)}`);

        (_.property('data.result.skuIdList')(data) || []).forEach(({couponCount, name, fullScore}) => {
          if (couponCount > 0) {
            let msg = `${name}还剩${couponCount}件, 需要电量${fullScore}`;
            userScore >= +fullScore && (msg += ', 可以打造成功, 快进行充电!');
            self.log(msg);
          }
        });
      });
    }

    // TODO 充电接口还没摸索到, 可能是 jdfactory_getLotteryResult
  }

  static async doCron(api) {
    const self = this;
    const _ = this._;

    const userScore = await api.jdfactory_getTaskDetail({}).then(async data => +_.property('data.result.userScore')(data));
    if (userScore >= 3000000) {
      return;
    }

    await api.jdfactory_collectElectricity().then(data => {
      this.log(`定时获取到的电量为 ${_.property('data.result.electricityValue')(data)}`);
    });
  }
}

module.exports = jdFactory;
