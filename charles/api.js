const fs = require('fs');
const path = require('path');
const exec = require('child_process').execSync;

const _ = require('lodash');

function extractForm(sessions, keys) {
  const reqBody = sessions
  .map(o => o.request.body.text)
  .map(text => text.split('&')
  .filter(str => keys.includes(str.split('=')[0])));
  return reqBody.map(array => {
    // ['key=value']
    return _.fromPairs(array.map(str => str.split('=').map(decodeURIComponent)));
  });
  ;
}

const gitIgnoreFiles = [
  'stall_collectScore',
  'liveActivityV946',
  'zoo_collectProduceScore',
];

const CHLSJ_PATH = path.resolve(__dirname, './chlsj');
const FORM_PATH = path.resolve(__dirname, './form');
const JD_CHLSJ_PATH = `${CHLSJ_PATH}/jd`;
const JD_FORM_PATH = `${FORM_PATH}/jd`;
const cashFormKeys = ['body', 'clientVersion', 'sign', 'st', 'sv', 'client', 'openudid'];
const cash = {
  functionIds: ['cash_homePage', 'cash_sign', 'cash_doTask', 'cash_getRedPacket'],
  cash_homePage: [],
  cash_sign: [],
  cash_doTask: [],
  cash_getRedPacket: [],
};
const zoo = {
  functionIds: ['zoo_collectProduceScore'],
  zoo_collectProduceScore: [],
};
const stall = {
  functionIds: ['stall_collectScore'],
  stall_collectScore: [],
};
const discover = {
  functionIds: ['discTaskList', 'discAcceptTask', 'discDoTask', 'discReceiveTaskAward'],
  discTaskList: [],
  discAcceptTask: [],
  discDoTask: [],
  discReceiveTaskAward: [],
};
const wish = {
  functionIds: ['wishContent'],
  wishContent: [],
};
const statistics = {
  functionIds: ['getJingBeanBalanceDetail'],
  getJingBeanBalanceDetail: [],
};
const live = {
  functionIds: ['liveChannelReportDataV912', 'liveActivityV946'],
  liveChannelReportDataV912: [],
  liveActivityV946: [],
};
const common = {
  functionIds: ['genToken', 'isvObfuscator'],
  genToken: [],
  isvObfuscator: [],
};
const smallBean = {
  functionIds: ['beanTaskList', 'beanDoTask'],
  beanTaskList: [],
  beanDoTask: [],
};
const necklace = {
  functionIds: ['reportCcTask', 'getCcTaskList', 'receiveNecklaceCoupon', 'ccSignInNew'],
  reportCcTask: [],
  getCcTaskList: [],
  receiveNecklaceCoupon: [],
  ccSignInNew: [],
};
const formatForm = (key, object) => {
  const jsonPath = `${JD_FORM_PATH}/${key}.json`;
  const originDir = `${JD_CHLSJ_PATH}/${key}`;
  let result = [];
  let originResult = [];
  try {
    result = JSON.parse(fs.readFileSync(jsonPath));
  } catch (e) {
    // ignore
  }

  if (_.isEmpty(result) || fs.existsSync(originDir)) {
    try {
      originResult = _.flatten(fs.readdirSync(originDir).reverse().map(fileName => {
        return JSON.parse(fs.readFileSync(`${originDir}/${fileName}`));
      }));
      (extractForm(originResult, cashFormKeys) || []).forEach(form => {
        if (!result.map(o => o.body).includes(form.body)) {
          result.push(form);
        }
      });
    } catch (e) {
      // ignore
    }
  }
  object[key] = result;

  fs.writeFileSync(jsonPath, JSON.stringify(result), {encoding: 'utf-8'});
  if (gitIgnoreFiles.some(functionId => jsonPath.match(functionId))) return;
  // 新增的json文件需要进行提交
  exec(`git add ${jsonPath}`);
};

function init() {
  [
    cash,
    stall,
    zoo,
    discover,
    wish,
    statistics,
    live,
    smallBean,
    common,
    necklace,
  ].forEach(o => {
    o.functionIds.forEach(key => {
      formatForm(key, o);
    });
  });
}

init();

module.exports = {
  cash,
  stall,
  zoo,
  discover,
  wish,
  statistics,
  live,
  smallBean,
  common,
  necklace,
};
