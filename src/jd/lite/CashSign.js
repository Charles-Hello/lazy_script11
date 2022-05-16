const Template = require('../base/template');

const {sleep, writeFileJSON, singleRun, replaceObjectMethod} = require('../../lib/common');
const _ = require('lodash');
const {getMoment} = require('../../lib/moment');
const EncryptH5st = require('../../lib/EncryptH5st');

const linkId = '9WA12jYGulArzWS7vcrwhw';
const origin = 'https://daily-redpacket.jd.com';

class LiteCashSign extends Template {
  static scriptName = 'LiteCashSign';
  static scriptNameDesc = '极速版签到提现';
  static shareCodeTaskList = [];
  static commonParamFn = () => ({});
  static needInSpeedApp = true;
  static times = 1;

  static apiOptions = {
    options: {
      uri: 'https://api.m.jd.com/',
      headers: {
        origin,
        referer: `${origin}/?activityId=${linkId}`,
      },
    },
  };

  static async beforeRequest(api) {
    const self = this;

    const encryptH5st = new EncryptH5st();
    const defaultForm = {
      body: {linkId, 'serviceName': 'dayDaySignGetRedEnvelopeSignService', 'business': 1},
      appid: 'activities_platform',
      client: 'H5',
      clientVersion: '1.0.0',
    };

    replaceObjectMethod(api, 'doFormBody', async ([functionId, body, signData, options = {}]) => {
      const t = getMoment().valueOf();
      let form = _.merge({t, body}, signData, defaultForm, options.form);
      if (['apSignIn_day'].includes(functionId)) {
        form = await encryptH5st.sign({functionId, ...form});
        ['_stk', '_ste'].forEach(key => {
          delete form[key];
        });
      }
      return [functionId, void 0, form, options];
    });
  }

  static async doMain(api) {
    const self = this;
    await self.beforeRequest(api);

    await api.doFormBody('apSignIn_day').then(data => {
      const {retCode, retMessage} = data.data || {};
      if (retCode === 0) {
        api.log('签到成功');
      } else {
        api.log(retMessage);
      }
    });

    await api.doFormBody('signPrizeDetailList', {'pageSize': 20, 'page': 1}).then(async data => {
      const cashData = (_.property('data.prizeDrawBaseVoPageBean.items')(data) || []).filter(o => o['prizeType'] === 4 && o['prizeStatus'] === 0);
      if (_.isEmpty(cashData)) return api.log('当前无可提现');
      await api.doFormBody('apCashWithDraw', {
        'businessSource': 'DAY_DAY_RED_PACKET_SIGN',
        'base': _.pick(cashData[0], ['prizeType', 'business', 'id', 'poolBaseId', 'prizeGroupId', 'prizeBaseId']),
      }).then(data => {
        const amount = _.get(data, 'data.record.amount');
        if (amount) {
          api.log(`正在提现${amount}`);
        } else {
          api.log(data.data);
        }
      });
    });
  }
}

singleRun(LiteCashSign).then();

module.exports = LiteCashSign;
