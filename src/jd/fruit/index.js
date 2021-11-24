const Template = require('../base/template');
const {getMoment} = require('../../lib/moment');

const {sleep, writeFileJSON, singleRun} = require('../../lib/common');

const indexUrl = 'https://carry.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html';

class Fruit extends Template {
  static scriptName = 'Fruit';
  static scriptNameDesc = '东东农场';
  static times = 1;
  static apiOptions = {
    options: {
      qs: {
        appid: 'wh5',
      },
      form: {
        body: {'version': 14, 'channel': 1, 'babelChannel': '120'},
      },
      headers: {
        referer: indexUrl,
      },
    },
    formatDataFn(data) {
      const amountLog = data => {
        if ('assistFriendList' in data) return;
        _.pick(data, ['amount', 'addEnergy', 'addWater']);
        const amount = _.first(_.values(_.pick(data, ['amount', 'addEnergy', 'addWater'])));
        amount && this.log(`获取的水滴数: ${amount}`);
      };
      amountLog(data);
      return data;
    },
  };

  static isSuccess(data) {
    return _.property('code')(data) === '0';
  }

  static async doMain(api, shareCodes) {
    const self = this;
    const needHarvest = false;
    const waterTimes = 0;

    // 指定浇水次数
    if (waterTimes) await handleWaterGoodForFarm(waterTimes);
    // 浇水到成熟
    if (needHarvest) return logFarmInfo(true);

    const {
      farmUserPro: {shareCode: currentShareCode},
      funCollectionHasLimit,
      canGotNewUserToday,
    } = await handleInitForFarm();

    // TODO 获取浇水阶段性奖励
    false && await api.doFormBody('gotStageAwardForFarm', {type: 1});

    // 新手任务获取水滴
    if (canGotNewUserToday) {
      await api.doFormBody('gotNewUserTaskForFarm');
    }

    patchShareCodeWithDefault();

    !funCollectionHasLimit && await getFullCollectionReward();
    await handleGetShareFinished();
    await handleDoTaskList();
    await handleDoShare();
    await handleClockIn();
    // 默认使用水滴翻倍卡
    await handleUseCard({type: 'doubleCard', maxTimes: Infinity});
    await logFarmInfo();

    // 增加默认助力码
    function patchShareCodeWithDefault() {
      let defaultShareCodes = [
        '9675151b3f1645d2afea9afb44c44716',
        '2886e4326e104eecb117f7a32732cda3',
      ];
      if (self.lastTimeInTheDay()) {
        defaultShareCodes = defaultShareCodes.concat([
          '599767762e104f77a3980598fab16a99',
          '4569adc9a868457fb35c14e8db3572a1',
        ]);
      }
      defaultShareCodes.forEach(code => {
        if ([currentShareCode, ...shareCodes].includes(code)) return;
        shareCodes.push(code);
      });
    }

    async function handleDoShare() {
      // 仅执行一次
      if (self.doneShareTask && !self.lastTimeInTheDay()) return;
      for (const shareCode of shareCodes) {
        await sleep(2);
        await handleInitForFarm(shareCode).then(data => {
          const {helpResult} = data;
          if (self.isSuccess(helpResult)) {
            api.log(`给 ${_.property('masterUserInfo.nickName')(helpResult) || 'unknown'} 助力成功`);
          }
        });
      }
    }

    async function handleUseCard(targetCards) {
      if (!targetCards) return;
      if (_.isString(targetCards)) {
        targetCards = {type: targetCards, maxTimes: 1};
      }
      targetCards = _.concat(targetCards);
      const cardData = await api.doFormBody('myCardInfoForFarm');
      const {cardInfos} = cardData;
      for (const {type, maxTimes} of targetCards) {
        const card = cardInfos.find(o => o.type === type);
        if (type === 'doubleCard') {
          const {farmUserPro: {totalEnergy}} = await handleInitForFarm();
          if (totalEnergy < 100) {
            api.log('当前水壶水滴低于100g, 请大于再进行使用翻倍卡');
            continue;
          }
        }
        if (!card) continue;
        const {useTimesInDay} = card;
        const limit = _.min([maxTimes || Infinity, cardData[type], useTimesInDay === -1 ? Infinity : useTimesInDay]);
        for (let i = 0; i < limit; i++) {
          const data = await api.doFormBody('userMyCardForFarm', {cardType: type, type: ''});
          if (!self.isSuccess(data)) break;
          await sleep(2);
        }
      }
    }

    // 获取助力人数满的奖励
    async function handleGetShareFinished() {
      const {amount = 0, assistFriendList, assistStageList} = await api.doFormBody('farmAssistInit');
      if (amount > 0) {
        await api.doFormBody('receiveStageEnergy');
        return handleGetShareFinished();
      }
      const assistStageStr = assistStageList.map(o => `${o['assistNum']}人(总计)/${o['waterEnergy']}水滴(每阶段)`).join(', ');
      api.log(`当前助力人数为: ${assistFriendList.length}, 收集奖励为${assistStageStr}`);
    }

    // 任务列表
    async function handleDoTaskList() {
      const taskData = await api.doFormBody('taskInitForFarm');
      const {
        // TODO orderInit 获取水滴
        // TODO treasureBoxInit 获取水滴
        signInit: {todaySigned},
        gotBrowseTaskAdInit: {userBrowseTaskAds},
        firstWaterInit: {firstWaterFinished},
        totalWaterTaskInit: {totalWaterTaskTimes, totalWaterTaskLimit, totalWaterTaskFinished},
      } = taskData;

      if (!todaySigned) {
        self.doneShareTask = false;
        await api.doFormBody('signForFarm');
      }

      for (const {advertId, time, limit, hadFinishedTimes} of userBrowseTaskAds) {
        if (limit === hadFinishedTimes) continue;
        await handleBrowse(advertId, time || 6);
      }
      const waterTimes = totalWaterTaskLimit - totalWaterTaskTimes;
      waterTimes > 0 && await handleWaterGoodForFarm(waterTimes);
      !firstWaterFinished && await api.doFormBody('firstWaterTaskForFarm');
      !totalWaterTaskFinished && await api.doFormBody('totalWaterTaskForFarm');

      await handleWaterRain(taskData);
      await handleWaterFriendForFarm(taskData);
      await handleGotThreeMeal(taskData);

      async function handleBrowse(advertId, time) {
        await api.doFormBody('browseAdTaskForFarm', {advertId, type: time ? 0 : 1});
        if (!time) return;
        await sleep(time);
        await api.doFormBody('browseAdTaskForFarm', {advertId, type: 1});
      }

      // 采集雨滴, 一天两次
      async function handleWaterRain(taskData) {
        const {
          waterRainInit: {winTimes, config: {maxLimit}},
        } = taskData;
        if (winTimes < maxLimit) {
          await api.doFormBody('waterRainForFarm', {type: 1, hongBaoTimes: 100});
        }
      }

      // 给好友浇水
      async function handleWaterFriendForFarm(taskData) {
        let {
          waterFriendTaskInit: {waterFriendCountKey, waterFriendMax, waterFriendGotAward},
        } = taskData;
        if (waterFriendGotAward) return;
        // 优先给 shareCode 浇水
        for (const shareCode of shareCodes) {
          await handleWaterFriend(shareCode);
        }
        // TODO 给朋友列表浇水

        if (waterFriendCountKey >= waterFriendMax) {
          await api.doFormBody('waterFriendGotAwardForFarm');
        }

        async function handleWaterFriend(shareCode) {
          if (waterFriendCountKey >= waterFriendMax) return;
          await sleep(2);
          return api.doFormBody('waterFriendForFarm', {shareCode}).then(data => {
            if (!self.isSuccess(data)) return;
            ++waterFriendCountKey;
          });
        }
      }

      // 三餐签到
      async function handleGotThreeMeal(taskData) {
        const {gotThreeMealInit: {f: threeMealFinished}} = taskData;
        !threeMealFinished && await api.doFormBody('gotThreeMealForFarm');
      }
    }

    // 连续签到
    async function handleClockIn() {
      await api.doFormBody('clockInInitForFarm').then(async data => {
        if (!self.isSuccess(data)) return;

        const {todaySigned, totalSigned, gotClockInGift, themes, signCardUseTimesLimit, signCard} = data;

        // 限时关注得水滴
        for (const {id, hadGot} of themes) {
          if (hadGot) continue;
          await api.doFormBody('clockInFollowForFarm', {id, type: 'theme', step: 1});
          await sleep(2);
          await api.doFormBody('clockInFollowForFarm', {id, type: 'theme', step: 2});
        }

        if (!todaySigned) {
          await api.doFormBody('clockInForFarm', {type: 1});
          return handleClockIn();
        }

        // 总签到获取水滴
        if (totalSigned === 7 && !gotClockInGift) {
          await api.doFormBody('clockInForFarm', {type: 2});
        }

        if (!signCardUseTimesLimit && signCard > 0) {
          await handleUseCard('signCard');
          return handleClockIn();
        }
      });
    }

    // 输出日志
    async function logFarmInfo(needHarvest = false) {
      return handleInitForFarm().then(async data => {
        const {farmUserPro: {treeEnergy, treeTotalEnergy, totalEnergy}, farmWinGoods} = data;
        if (!treeTotalEnergy) {
          // TODO 种植水果
          const targetGood = _.maxBy(farmWinGoods, 'prizeLevel');
          false && targetGood && await handleChoiceGoodsForFarm(targetGood.type);
          return api.log('目前没有种植水果');
        }
        const remainEnergy = treeTotalEnergy - treeEnergy;
        let msg = `需要总水滴数为: ${treeTotalEnergy}, 收成还差水滴数: ${remainEnergy}, 当前水滴数: ${totalEnergy}`;
        const canHarvest = remainEnergy <= totalEnergy;
        canHarvest && (msg += ', 可以收成了!!!');
        api.log(msg);
        if (needHarvest && canHarvest) {
          const waterTimes = remainEnergy / 10;
          const time = getMoment().add(waterTimes * 3, 's');
          api.log(`完成需浇水 ${waterTimes} 次, 在 ${time.format()} 之后可以完成`);
          await handleWaterGoodForFarm(waterTimes);
        }
      });
    }

    // 点小鸭子
    async function getFullCollectionReward() {
      return api.doFormBody('getFullCollectionReward', {type: 2}).then(data => {
        if (self.isSuccess(data)) return getFullCollectionReward();
      });
    }

    async function handleWaterGoodForFarm(times) {
      if (process.env.JD_FRUIT_WATER_DISABLE) return;
      let successTimes = 0;
      for (let i = 0; i < times; i++) {
        await sleep(2);
        const canNext = await api.doFormBody('waterGoodForFarm').then(data => {
          if (self.isSuccess(data)) {
            successTimes++;
            return true;
          }
        });
        if (!canNext) return;
      }
      successTimes && api.log(`成功浇水 ${successTimes} 次`);
    }

    async function handleInitForFarm(shareCode) {
      const farmData = await api.doFormBody('initForFarm', {shareCode});
      if (_.get(farmData, 'todayGotWaterGoalTask.canPop')) {
        // 被水滴砸中
        await api.doFormBody('gotWaterGoalTaskForFarm', {type: 3});
      }
      return farmData;
    }

    // 种树
    async function handleChoiceGoodsForFarm(goodsType) {
      // 如果没有, 则种植最高等级的
      if (!goodsType) {
        const {prizeLevelList} = await api.doFormBody('getExchangeLevelList');
        const {hasPlant, currentGoodList} = _.maxBy(prizeLevelList, 'prizeLevel');
        if (hasPlant) return;
        goodsType = currentGoodList[0].goodsType;
      }
      return api.doFormBody('choiceGoodsForFarm', {
        'imageUrl': '',
        'nickName': '',
        'shareCode': '',
        goodsType,
        'type': '0',
      }).then(data => {
        api.log(JSON.stringify(data));
      });
    }
  }
}

singleRun(Fruit).then();

module.exports = Fruit;
