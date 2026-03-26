const cloud = require('wx-server-sdk');

const CLOUD_ENV_ID = 'cloud1-6gor9uqobed844dd';

cloud.init({
  env: CLOUD_ENV_ID
});

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const operatorUuid = wxContext.OPENID || '';

  return {
    operatorUuid,
    openid: operatorUuid,
    appid: wxContext.APPID || '',
    unionid: wxContext.UNIONID || ''
  };
};
