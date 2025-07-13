// doubao_crawler.ts

import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page, Download } from 'playwright';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const authFile = path.join(__dirname, 'auth.json');
  let context: BrowserContext;
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: false,
    });

    if (fs.existsSync(authFile)) {
      console.log('发现认证文件，尝试恢复会话...');
      context = await browser.newContext({ storageState: authFile });
      console.log('会话已加载，正在验证...');
    } else {
      console.log('未发现认证文件，将启动新会话。');
      context = await browser.newContext();
    }

    const page: Page = await context.newPage();

    console.log('导航至豆包...');
    await page.goto('https://www.doubao.com/chat/');

    let isLoggedIn = false;
    try {
      await page.waitForSelector("[data-testid='chat_header_avatar_button']", { state: 'visible', timeout: 5000 });
      isLoggedIn = true;
    } catch (e) {
      // 忽略超时错误
    }

    if (isLoggedIn) {
      console.log('✅ 用户已登录。');
      await context.storageState({ path: authFile });
    } else {
      console.log('❌ 用户未登录，正在尝试自动获取二维码...');
      await page.getByTestId('to_login_button').click();
      
      console.log('正在切换到二维码登录...');
      const switcher = page.getByTestId('qrcode_switcher');
      
      console.log('尝试点击切换按钮的右上角区域...');
      // 根据用户提供的56x56尺寸，我们计算出精确的右上角坐标
      await switcher.click({ position: { x: 51, y: 5 } });

      const qrCodeLocator = page.getByTestId('qrcode_image');
      await qrCodeLocator.waitFor({ state: 'visible', timeout: 10000 });
      
      console.log('正在从源码提取二维码...');
      const qrCodeSrc = await qrCodeLocator.getAttribute('src');
      if (!qrCodeSrc) {
        throw new Error('未能获取二维码图像的 src 属性。');
      }

      const base64Data = qrCodeSrc.replace(/^data:image\/png;base64,/, '');
      const qrCodePath = path.join(__dirname, 'qrcode.png');
      fs.writeFileSync(qrCodePath, base64Data, 'base64');
      
      console.log(`✅ 二维码已保存至: ${qrCodePath}`);
      console.log('请扫描二维码完成登录，脚本将等待 5 分钟...');

      try {
        await page.waitForSelector("[data-testid='chat_header_avatar_button']", { state: 'visible', timeout: 300000 });
        console.log('✅ 登录成功！正在保存会话信息...');
        await context.storageState({ path: authFile });
        console.log(`会话已保存至 ${authFile}`);
        // 登录成功后删除二维码图片
        if (fs.existsSync(qrCodePath)) {
          fs.unlinkSync(qrCodePath);
        }
      } catch (error) {
        console.error('❌ 在规定时间内未检测到登录，脚本将退出。');
        throw new Error('Login timeout');
      }
    }

    await page.getByTestId('skill_bar_button_more').click();
    await page.getByTestId('skill_bar_button_26').getByText('AI 播客').click();
    await page.getByTestId('upload_file_button').click();

    console.log('准备上传文件...');
    const fileToUpload = path.join(__dirname, '2502.00706v1.pdf');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('upload_file_panel_upload_item').click()
    ]);
    await fileChooser.setFiles(fileToUpload);
    console.log('文件已选择，准备发送...');

    await page.getByTestId('chat_input_send_button').click();

    console.log('等待任务页面加载...');
    await page.waitForURL(/\/chat\/\d+/);
    console.log('任务已开始生成。');

    const maxRetries = 90;
    const pollIntervalSeconds = 10;

    const cardLocator = page.locator('div[data-plugin-identifier="Symbol(receive-podcast-content)"]').last();
    const titleLocator = cardLocator.locator('[class*="title-"]');
    const downloadButtonLocator = cardLocator.locator('div[class*="actionBtn-"]:has(span[class*="downloadBtn"])');

    console.log(`开始轮询播客生成状态...`);

    for (let i = 0; i < maxRetries; i++) {
      const reportTitle = (await titleLocator.innerText({ timeout: 5000 }).catch(() => '播客生成中...')).trim();
      console.log(`--- 第 ${i + 1}/${maxRetries} 次尝试: '${reportTitle}' ---`);
      
      const buttonClass = await downloadButtonLocator.getAttribute('class').catch(() => 'disabled');
      
      if (buttonClass && !buttonClass.includes('disabled')) {
        console.log(`✅ 成功！'${reportTitle}' 的下载按钮已激活。`);

        const [download] = await Promise.all([
          page.waitForEvent('download'),
          downloadButtonLocator.click()
        ]);

        const safeFilename = reportTitle.replace(/[\\/*?:"<>|]/g, '');
        const extension = path.extname(download.suggestedFilename());
        const downloadsDir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadsDir)) {
          fs.mkdirSync(downloadsDir);
        }
        const savePath = path.join(downloadsDir, `${safeFilename}${extension}`);
        
        await download.saveAs(savePath);
        console.log(`🚀 文件下载成功，已保存至: ${savePath}`);
        break; 
      } else {
        console.log("❌ 按钮仍处于禁用状态。");
      }

      if (i < maxRetries - 1) {
        console.log(`等待 ${pollIntervalSeconds} 秒后刷新...`);
        await page.waitForTimeout(pollIntervalSeconds * 1000);
        console.log("🔄 正在刷新页面...");
        await page.reload({ waitUntil: 'networkidle' });
      } else {
        console.log("❌ 轮询失败，已达到最大尝试次数。");
      }
    }
  } catch (error) {
    console.error("脚本执行过程中发生严重错误:", error);
  } finally {
    if (browser) {
      console.log("任务结束，关闭浏览器。");
      await browser.close();
    }
  }
}

main().catch(console.error);
