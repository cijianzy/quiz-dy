// 抖音小程序原生支付中转页：H5 通过 tt.miniProgram.navigateTo 跳进来。
//
// 由于 web-view 的 onMessage 只在用户离开 web-view（返回 / 关闭 / 分享）时
// 才会触发，不能用 postMessage 来同步唤起 tt.pay。所以走中转页：
//   H5 → tt.miniProgram.navigateTo('/pages/pay/pay?order_id=..&order_token=..')
//   本页 onLoad 同步调用 tt.pay
//   不论成功/失败/用户取消，都 navigateBack 回到 web-view，由 H5 端兜底查单。

Page({
  data: {
    loading: true,
    tip: '正在唤起支付…',
  },

  onLoad(query) {
    const orderId = query && query.order_id ? decodeURIComponent(query.order_id) : '';
    const orderToken = query && query.order_token ? decodeURIComponent(query.order_token) : '';
    const outOrderNo = query && query.out_order_no ? decodeURIComponent(query.out_order_no) : '';

    if (!orderId || !orderToken) {
      console.warn('[quiz-dy pay] missing order params:', query);
      tt.showToast({ title: '支付参数缺失', icon: 'none' });
      this.backSoon();
      return;
    }

    tt.pay({
      orderInfo: {
        order_id: orderId,
        order_token: orderToken,
      },
      service: 5,
      success: (res) => {
        console.log('[quiz-dy pay] tt.pay success:', res, 'outOrderNo=', outOrderNo);
        this.backSoon();
      },
      fail: (err) => {
        console.warn('[quiz-dy pay] tt.pay fail:', err, 'outOrderNo=', outOrderNo);
        const code = err && (err.errNo || err.errno || err.code);
        if (code === 9 || code === '9') {
          tt.showToast({ title: '已取消支付', icon: 'none' });
        } else {
          tt.showToast({
            title: (err && (err.errMsg || err.errString)) || '支付失败',
            icon: 'none',
          });
        }
        this.backSoon();
      },
    });
  },

  backSoon() {
    setTimeout(() => {
      tt.navigateBack({
        delta: 1,
        fail: () => {
          // 兜底：回不到上一页时落到 web-view 中转页（首屏 index 已改为原生入口按钮页）
          tt.redirectTo({ url: '/pages/web/web' });
        },
      });
    }, 200);
  },
});
