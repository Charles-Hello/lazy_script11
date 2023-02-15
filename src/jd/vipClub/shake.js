const Template = require('../base/template');

const {sleep, writeFileJSON} = require('../../lib/common');

const appid = 'sharkBean';

class VipClubShake extends Template {
  static scriptName = 'VipClubShake';
  static scriptNameDesc = '领豆豆-摇一摇';
  static shareCodeTaskList = [];
  static times = 1;
  static commonParamFn = qs => [void 0, void 0, {qs}];

  static apiOptions = {
    options: {
      method: 'GET',
      qs: {
        appid: 'vip_h5',
      },
      headers: {
        'referer': 'https://vip.m.jd.com',
      },
    },
  };

  static apiExtends = {
    requestFnName: 'doGet',
  };

  static isSuccess(data) {
    return this._.property('success')(data);
  }

  static async beforeRequest(api) {
    const self = this;

    this.injectEncryptH5st(api, {
      defaultData: {},
      config: {
        vvipclub_shaking_lottery: {
          appId: 'ae692',
        },
        pg_channel_page_data: {
          appId: '28cc6',
        },
      },
      replaceMethods: ['doGet'],
    });
  }

  static apiNamesFn() {
    const self = this;

    const getTaskFn = (info) => JSON.stringify({info, withItem: true});
    return {
      // 获取任务列表
      getTaskList: {
        name: 'vvipclub_lotteryTask',
        paramFn: () => ({body: getTaskFn('browseTask')}),
        async successFn(data, api) {
          // writeFileJSON(data, 'vvipclub_lotteryTask.json', __dirname);

          if (!self.isSuccess(data)) return [];

          // 签到
          await api.doGet('pg_channel_page_data', {
            appid,
            body: {'paramData': {'token': 'dd2fb032-9fa3-493b-8cd0-0d57cd51812d'}},
          }).then(async data => {
            const floorToken = _.property('data.floorInfoList[1].token')(data);
            const currSignCursor = _.property('data.floorInfoList[1].floorData.signActInfo.currSignCursor')(data);
            const signActCycles = _.property('data.floorInfoList[1].floorData.signActInfo.signActCycles')(data);
            if (signActCycles[currSignCursor - 1]['signStatus'] === 0) return;
            return api.doGet('pg_interact_interface_invoke', {
              appid,
              body: {
                floorToken,
                'dataSourceCode': 'signIn',
                'argMap': {currSignCursor},
              },
            });
          });

          // 活动太火爆
          const attentionTaskData = {} || await api.doGetBody('vvipclub_lotteryTask', getTaskFn('attentionTask'));

          const result = [];

          for (let {
            totalPrizeTimes: maxTimes,
            currentFinishTimes: times,
            waitDuration,
            taskItems,
            taskName,
          } of data.data.concat(_.get(attentionTaskData, 'data', []))) {
            let list = taskItems.map(o => ({
              taskItemId: o.id,
              taskName,
              finish: o.finish,
            }));

            result.push({
              list,
              option: {maxTimes: _.min([list.length, maxTimes]), times, waitDuration, isFinishFn: o => o.finish},
            });
          }

          return result;
        },
      },
      doTask: {
        name: 'vvipclub_doTask',
        paramFn: body => ({body}),
      },
      // 新版
      // doRedeem: {
      //   name: 'vvipclub_shaking_lottery',
      //   paramFn: () => ({appid}),
      //   async successFn(data, api) {
      //     if (!self.isSuccess(data)) return false;
      //     const rewardBeanAmount = _.property('data.rewardBeanAmount')(data);
      //     rewardBeanAmount && api.log(`[新版]获取到豆豆: ${rewardBeanAmount}`);
      //     if (!_.property('data.remainLotteryTimes')(data)) return false;
      //   },
      //   repeat: true,
      // },
    };
  };
}

module.exports = VipClubShake;
