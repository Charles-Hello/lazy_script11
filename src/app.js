const _ = require('lodash');
const {getNowDate, getNowHour} = require('./lib/moment');
const {getCookieData, updateProcessEnv} = require('./lib/env');
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

const Common = require('./jd/base/common');

const Sign = require('./jd/sign');
const SignShop = require('./jd/sign/shop');
const SignRemote = require('./jd/sign/remote');
const PlantBean = require('./jd/plantBean');
const SuperMarket = require('./jd/superMarket');
const SuperMarketRedeem = require('./jd/superMarket/redeem');
const Pet = require('./jd/pet');
const Fruit = require('./jd/fruit');
const TurnTableFarm = require('./jd/fruit/turnTableFarm');
const Wfh = require('./jd/wfh');
const Harmony1 = require('./jd/wfh/harmony1');
const Harmony2 = require('./jd/wfh/harmony2');
const Harmony3 = require('./jd/wfh/harmony3');
const Harmony4 = require('./jd/wfh/harmony4');
const Harmony5 = require('./jd/wfh/harmony5');
const Earn = require('./jd/earn');
const Cash = require('./jd/cash');
const CashShare = require('./jd/cash/share');
const StatisticsBean = require('./jd/statistics/bean');
const StatisticsRedEnvelope = require('./jd/statistics/RedEnvelope');
const Ssjj = TemporarilyOffline || require('./jd/ssjj'); // 没什么收益, 所以进行移除
const IsvShopSign = require('./jd/isv/shopSign');
const CrazyJoy = TemporarilyOffline || require('./jd/crazyJoy');
const SecondKillRedPacket = require('./jd/secondKill/redPacket');
const DreamFactory = TemporarilyOffline || require('./jd/dreamFactory');
const JxCfd = TemporarilyOffline || require('./jd/jxCfd');
const VipClubShake = require('./jd/vipClub/shake');
const KoiRedPacket = TemporarilyOffline || require('./jd/koiRedPacket');
const Joy = require('./jd/joy');
const JoyRedeem = require('./jd/joy/redeem');
const Family = TemporarilyOffline || require('./jd/family');
const BianPao = require('./jd/family/bianPao');
const JxHongBao = require('./jd/family/jxHongBao');
const JxFarm = require('./jd/wq/JxFarm');
const WomenBlindBox = TemporarilyOffline || require('./jd/family/WomenBlindBox');
const LuckyToHitTheGoldenEgg = require('./jd/family/LuckyToHitTheGoldenEgg');
const Live = require('./jd/live');
const LiveRedEnvelopeRain = TemporarilyOffline || require('./jd/live/RedEnvelopeRain');
const SignBeanHome = require('./jd/sign/beanHome');
const GlobalChallenge = TemporarilyOffline || require('./jd/globalMart/challenge');
const Singjd = require('./jd/wq/singjd');
const Isp5G = require('./jd/isp5g');
const Carnivalcity = require('./jd/shoppingFestival/carnivalcity');
const Xiemi = require('./jd/xiemi/index');
const BeanSmallBean = require('./jd/sign/beanSmallBean');
const GoldCreator = require('./jd/goldCreator');
const Joy20210805 = require('./jd/joy/20210805');
const SuperBrandDay = TemporarilyOffline || require('./jd/superBrand/day');
const SuperBrandProduct = TemporarilyOffline || require('./jd/superBrand/Product');
const DDSJ = require('./jd/ddsj');
const RubikSCube = require('./jd/rubikSCube');
const Kmg = require('./jd/kmg');

/* 极速版 */
const LiteSign = require('./jd/lite/Sign');
const SpringReward = require('./jd/lite/SpringReward');
const EarnCoins = require('./jd/lite/EarnCoins');
const LiteCashSign = require('./jd/lite/CashSign');

/* 本地执行 */
const ReceiveNecklaceCoupon = require('./jd/local/ReceiveNecklaceCoupon');

const nowDate = getNowDate();
const nowHour = getNowHour();

main().then(sendNotify.bind(0, {
  sendYesterdayLog: nowHour === 23,
  subjects: [void 0, nowDate, nowHour],
}));

async function main() {
  if (process.env.NOT_RUN) {
    console.log('不执行脚本');
    return;
  }

  // 统计
  const statistics = [
    StatisticsBean,
    StatisticsRedEnvelope,
  ];
  // 常驻活动
  const longTermActivity = [
    SignBeanHome, Sign,
    Fruit, Pet, TurnTableFarm,
    Cash,
    BeanSmallBean,
    PlantBean,
    Family,
    Live,
    SecondKillRedPacket,
    VipClubShake,
    SuperMarket,
    [Earn, getCookieData(Earn.scriptName, 'JD_EARN_COOKIE')],
    SuperBrandDay,
    GoldCreator,
  ];
  // 极速版
  const lites = [
    LiteSign, SpringReward, LiteCashSign, EarnCoins,
  ];
  // 短期活动
  const shortTermActivity = [
    DDSJ,
    RubikSCube,
    Kmg,
    SuperBrandProduct,
  ];
  const scheduleOptions = [
    {
      valid: 0,
      run: async () => {
        await serialRun([
          KoiRedPacket,
          // 23点后的活动补充
          IsvShopSign,
          SignShop,

          ...statistics,
          ...longTermActivity,
          ...lites,
          ...shortTermActivity,
        ]);
        await multipleRun([
          Harmony1,
          Harmony2,
          Harmony3,
          Harmony4,
          Harmony5,
        ]);
      },
    },
    {
      valid: 5,
      run: async () => {
        // await doRun(JxFarm);
      },
    },
    {
      valid: 6,
      run: async () => {
        await doCron(TurnTableFarm);
        await serialRun(Joy);
      },
    },
    {
      valid: 7,
      run: async () => {
        await serialRun([
          Fruit, Pet,
          EarnCoins,
          Family,
        ]);
      },
    },
    {
      valid: 9,
      run: async () => {
        await serialRun(Joy);
        await doRun(DreamFactory);
      },
    },
    {
      valid: 10,
      run: async () => {
      },
    },
    {
      valid: 12,
      run: async () => {
        await serialRun([
          Fruit, Pet,
        ]);
      },
    },
    {
      valid: 14,
      run: async () => {
      },
    },
    {
      valid: 15,
      run: async () => {
        await doRun(CrazyJoy);
      },
    },
    {
      valid: 16,
      run: async () => {
        await doRun(PlantBean);
      },
    },
    {
      valid: 18,
      run: async () => {
        await serialRun([
          Fruit, Pet,
        ]);
      },
    },
    {
      valid: 19,
      run: async () => {
      },
    },
    {
      valid: 20,
      run: async () => {
      },
    },
    {
      valid: 22,
      run: async () => {
        await serialRun([
          Fruit, Pet,
          EarnCoins,
          SuperMarket,
          StatisticsRedEnvelope,
        ]);
      },
    },
    {
      valid: 23,
      run: async () => {
        await serialRun([
          Sign,
          KoiRedPacket,
          Cash,
          PlantBean,
          [PlantBean, void 0, 'cron'],
        ]);
        // await doRun(CrazyJoy);

        // 24点后定时启动
        await multipleRun([
          SignShop,
          // SuperMarketRedeem,
          // JoyRedeem,
        ]);
        await multipleRun([
          IsvShopSign,
          // 做任务抽奖
          WomenBlindBox,
        ], 0);
      },
    },
  ];

  await cronLoop();

  for (const {valid, run} of scheduleOptions) {
    if (nowHour === valid) {
      await run();
    }
  }

  // 定时循环
  async function cronLoop() {
    await doCron(CrazyJoy);

    if (nowHour % 2 === 0) {
      await doCron(PlantBean);
    }

    if (nowHour % 5 === 0) {
      await serialRun(Joy, doCron);
    }

    if (nowHour % 6 === 0) {
      await doCron(SuperMarket);
    }
  }
}
