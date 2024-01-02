const _ = require('lodash');
const {getNowDate, getNowHour} = require('./lib/moment');
const {getCookieData, updateProcessEnv, processInAC, getEnv} = require('./lib/env');
const {sleepTime} = require('./lib/cron');
const {sleep} = require('./lib/common');
require('../src/lib/common').exec('node src/shell/updateEnvFromMail.js');
updateProcessEnv();
const {
  multipleRun,
  serialRun,
  doRun,
  doRun1,
  doCron,
  doCron1,
  TemporarilyOffline,
  sendNotify,
} = require('./api');

const Fruit = require('./jd/fruit');
let Joy = TemporarilyOffline || require('./jd/joy');

const nowDate = getNowDate();
const nowHour = getNowHour();

const _send = _.noop || sendNotify.bind(0, {
  sendYesterdayLog: nowHour === 23,
  subjects: [void 0, nowDate, nowHour],
});
// 超时需自动退出
const autoExit = async () => {
  await sleep(60 * 60);
  _send();
  process.exit();
};

if (processInAC()) {
  Joy = TemporarilyOffline;
}

!getEnv('DISABLE_AUTO_EXIT') && autoExit();
main().then(_send);

async function main() {
  if (process.env.NOT_RUN) {
    console.log('不执行脚本');
    return;
  }

  if ([10, 15, 21].includes(nowHour)) {
    await doRun(require('./jd/lite/EarnCoins'));
  }

  // if ([0, 7, 12, 18, 22, 23].includes(nowHour)) {
  //   await doRun(Fruit);
  // }

  // if (nowHour === 23) {
  //   await sleepTime(24);
  //   await doRun(require('./jd/earn/AdvertPlugin'));
  // }
}
