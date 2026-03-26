const OPERATOR_PROFILE_KEY = 'lab-stock-operator-profile-v1';

let operatorProfilePromise = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCachedOperatorProfile() {
  const profile = wx.getStorageSync(OPERATOR_PROFILE_KEY);
  if (!profile || !profile.nickName || !profile.operatorUuid) {
    return null;
  }

  return clone(profile);
}

function saveOperatorProfile(profile) {
  wx.setStorageSync(OPERATOR_PROFILE_KEY, clone(profile));
}

function requestUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于记录出入库操作人信息',
      success: (res) => {
        resolve(res.userInfo || {});
      },
      fail: () => {
        reject(new Error('需要先授权获取微信昵称，才能记录本次出入库操作'));
      }
    });
  });
}

function requestOperatorUuid() {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'currentUser',
      success: (res) => {
        const result = res && res.result ? res.result : {};
        const operatorUuid = result.operatorUuid || result.openid || '';
        if (!operatorUuid) {
          reject(new Error('未能获取当前微信用户 UUID'));
          return;
        }

        resolve(operatorUuid);
      },
      fail: () => {
        reject(new Error('未能获取当前微信用户 UUID，请先部署 currentUser 云函数'));
      }
    });
  });
}

async function ensureOperatorProfile() {
  const cached = getCachedOperatorProfile();
  if (cached) {
    return cached;
  }

  if (!wx.cloud) {
    throw new Error('请先初始化云开发');
  }

  if (!operatorProfilePromise) {
    operatorProfilePromise = Promise.all([
      requestUserProfile(),
      requestOperatorUuid()
    ])
      .then(([userInfo, operatorUuid]) => {
        const profile = {
          nickName: userInfo.nickName || '微信用户',
          avatarUrl: userInfo.avatarUrl || '',
          operatorUuid
        };
        saveOperatorProfile(profile);
        return profile;
      })
      .finally(() => {
        operatorProfilePromise = null;
      });
  }

  return operatorProfilePromise;
}

module.exports = {
  ensureOperatorProfile,
  getCachedOperatorProfile
};
