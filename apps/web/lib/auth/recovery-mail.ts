// The password-reset mail, carried over from the Supabase template so it
// looks the same. The code sits in the <h1> and in the closing
// "@ai.winlab.tw #code" line, which lets browsers offer to fill it in.
export function recoveryMail(otp: string) {
  return {
    subject: "【人工智慧專責辦公室】密碼重設驗證碼",
    text: `您的密碼重設驗證碼：${otp}\n\n此驗證碼將於 1 小時後失效。若您並未提出此請求，請忽略此封郵件。\n\n@ai.winlab.tw #${otp}`,
    html: `<!DOCTYPE html>
  <html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verification code</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Noto Sans TC','Noto Sans',Arial,sans-serif;color:#111;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding-bottom:24px;" align="center">
                <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#111;">Office of AI Affairs</span>
              </td>
            </tr>
            <tr>
              <td style="background:#fff;border-radius:16px;border:1px solid #e5e5e5;padding:44px 36px 40px;">
                <h1 style="margin:0 0 8px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:42px;font-weight:700;letter-spacing:0.22em;color:#111;line-height:1.1;text-align:center;">${otp}</h1>
                <p style="margin:0 0 32px;font-size:13px;color:#999;line-height:1.6;text-align:center;letter-spacing:0.08em;text-transform:uppercase;">
                  Verification code
                </p>

                <p style="margin:0 0 12px;font-size:15px;color:#444;line-height:1.7;">
                  您好，請回到「忘記密碼」頁面輸入上方 8 位數字完成密碼重設。
                </p>

                <p style="margin:0 0 12px;font-size:13px;color:#888;line-height:1.6;">
                  請在原本的瀏覽器分頁中輸入此驗證碼，切勿將驗證碼轉發給任何人。
                </p>

                <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />

                <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
                  此驗證碼將於 <strong style="color:#666;">1 小時</strong>後失效。<br/>
                  若您並未提出此請求，請忽略此封郵件，您的帳號不會有任何變更。
                </p>

              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;" align="center">
                <p style="margin:0 0 4px;font-size:13px;color:#aaa;">國立陽明交通大學 人工智慧專責辦公室</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;" align="center">
                <p style="margin:0;font-size:11px;color:#d4d4d8;font-family:'SF Mono',Menlo,Consolas,monospace;letter-spacing:0.05em;">@ai.winlab.tw #${otp}</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`,
  };
}
