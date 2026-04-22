// quiz-dy 小程序 web-view 中转页：把 H5（xiaoce-front）加载进来，
// 并把抖音登录所需的临时 code 通过 URL 透传过去，由 H5 端的 dyAutoLogin
// 接住完成自动登录（cookie 由后端 Set-Cookie 落到 web-view 浏览器会话里）。
//
// 入口路径：
//   /pages/web/web?path=<encodeURIComponent(H5 路径，比如 "/?tab=daily")>
//
// 也兼容从原生 login 页 redirectTo 回来时，通过 app.globalData.dyReturnPath
// 指定回跳的 H5 路径，让 web-view 落回登录前所在的页面。

const app = getApp();

const BASE_URL = 'https://xiaoce.fun';
// 等 tt.login 的最长时间，超时就先打开页面（H5 端会以未登录态展示，
// 用户后续可以在 H5 内点登录按钮触发原生授权页流程）
const CODE_WAIT_MS = 1500;

Page({
  data: {
    src: '',
  },

  onLoad(query) {
    // 1) 优先用原生 login 页带回的 returnPath（用一次就清，避免后续误用）
    let targetPath = app.globalData.dyReturnPath || '';
    app.globalData.dyReturnPath = null;

    // 2) 否则用 query.path（从首页按钮带过来）
    if (!targetPath && query && query.path) {
      try {
        targetPath = decodeURIComponent(query.path);
      } catch (e) {
        targetPath = query.path;
      }
    }

    // 一键授权登录：用 globalData.dyCode（onLaunch 静默 tt.login 或原生 login 页的 fresh code）
    Promise.race([
      app.globalData.dyCodePromise || Promise.resolve(null),
      new Promise((resolve) => setTimeout(() => resolve(null), CODE_WAIT_MS)),
    ]).then((code) => {
      let url = BASE_URL + (targetPath || '');
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
      console.log('[quiz-dy web] webview message:', list);
    }
  },
});
