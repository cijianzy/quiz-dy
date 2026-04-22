// quiz-dy 小程序壳：把 web-view 加载到 H5（xiaoce-front），
// 并把登录所需的临时参数通过 URL 传过去，由 H5 端的 dyAutoLogin 接住完成登录。
//
// 当前模式：一键授权登录，URL 上带 ?dy_code=xxx，H5 调 /loginWithDyMpCode
// 备用模式：手机号登录，URL 上带 ?dy_phone_code=xxx&dy_phone_data=xxx&dy_phone_iv=xxx，
//          H5 调 /loginWithDyMpPhone（已注释，等抖音「获取手机号」能力开通后切回）

const app = getApp();

const BASE_URL = 'https://xiaoce.fun';
// 等 tt.login 的最长时间，超时就先打开页面（H5 端会以未登录态展示，
// 用户后续可以在 H5 内点登录按钮触发原生授权页流程）
const CODE_WAIT_MS = 1500;

Page({
  data: {
    src: '',
  },

  onLoad() {
    // returnPath：从原生 login 页登录回来时带的 H5 原本所在页面，让 web-view 直接落回去
    // 冷启动时通常为空，落到根路径
    const returnPath = app.globalData.dyReturnPath || '';
    app.globalData.dyReturnPath = null; // 用一次就清，避免下次冷启动复用陈旧路径

    // ---- 手机号登录链路（暂时停用）----
    // const phoneCode = app.globalData.dyPhoneCode;
    // const phoneData = app.globalData.dyPhoneEncryptedData;
    // const phoneIv = app.globalData.dyPhoneIv;
    // if (phoneCode && phoneData && phoneIv) {
    //   app.globalData.dyPhoneCode = null;
    //   app.globalData.dyPhoneEncryptedData = null;
    //   app.globalData.dyPhoneIv = null;
    //   let url = BASE_URL + (returnPath || '');
    //   const sep = url.includes('?') ? '&' : '?';
    //   url +=
    //     `${sep}dy_phone_code=${encodeURIComponent(phoneCode)}` +
    //     `&dy_phone_data=${encodeURIComponent(phoneData)}` +
    //     `&dy_phone_iv=${encodeURIComponent(phoneIv)}`;
    //   this.setData({ src: url });
    //   return;
    // }

    // 一键授权登录：用 globalData.dyCode（onLaunch 静默 tt.login 或原生 login 页的 fresh code）
    Promise.race([
      app.globalData.dyCodePromise || Promise.resolve(null),
      new Promise((resolve) => setTimeout(() => resolve(null), CODE_WAIT_MS)),
    ]).then((code) => {
      let url = BASE_URL + (returnPath || '');
      if (code) {
        const sep = url.includes('?') ? '&' : '?';
        url += `${sep}dy_code=${encodeURIComponent(code)}`;
      }
      this.setData({ src: url });
    });
  },

  // web-view 内 H5 调 tt.miniProgram.postMessage 发的消息会在这里聚合下发，
  // 但只在用户返回 / 关闭 / 分享 / navigateBack 时才触发，**不能用于实时唤起 tt.pay**。
  // 真正的支付流程已改为：H5 调 tt.miniProgram.navigateTo('/pages/pay/pay?...')，
  // 由中转页 onLoad 同步调用 tt.pay。这里仅保留作为日志/兜底。
  onWebViewMessage(e) {
    const list = (e && e.detail && e.detail.data) || [];
    if (list.length) {
      console.log('[quiz-dy index] webview message:', list);
    }
  },
});
