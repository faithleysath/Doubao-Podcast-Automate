import { DoubaoSdk } from './DoubaoSdk.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runDemo() {
  // 1. 初始化 SDK
  // - workspace: 用于存放下载的音频文件
  // - headless: false 表示我们会看到浏览器界面，方便调试
  const sdk = new DoubaoSdk({
    workspace: __dirname,
    headless: false, 
    // 如果使用远程浏览器，请取消下面的注释并填入你的 B-a-a-S 地址
    // browserWSEndpoint: 'ws://your-browser-as-a-service-endpoint'
  });

  try {
    // 2. 启动浏览器和页面
    await sdk.init();

    // 3. 登录
    await sdk.login(async (qrCodeBase64) => {
      // 在真实场景中，你会将这个 base64 字符串通过 API 发送给前端显示
      console.log('需要扫描二维码登录！');
      console.log('二维码 Base64 (部分):', qrCodeBase64.substring(0, 50) + '...');
      
      const qrCodePath = path.join(__dirname, '..', 'qrcode.png');
      fs.writeFileSync(qrCodePath, qrCodeBase64, 'base64');
      console.log(`✅ 二维码已保存至: ${qrCodePath}`);
      console.log('请在300秒内扫描二维码...');
    });

    console.log('✅ 登录流程已确认，继续执行。');

    // 4. 导出鉴权信息
    const exportedState = sdk.getStorageState();
    if (exportedState) {
      console.log('✅ 鉴权信息已导出，可以将其保存以便下次使用。');
      // 在真实应用中，你会将 JSON.stringify(exportedState) 保存到数据库或文件中
    }

    // 5. 生成播客
    // 我们使用项目中的示例 PDF 文件
    const documentToProcess = path.join(__dirname, '..', '2502.00706v1.pdf');
    console.log(`准备处理文件: ${documentToProcess}`);

    const audioFilePath = await sdk.generatePodcast(documentToProcess);

    console.log('🎉 演示完成！');
    console.log(`音频文件已成功下载至: ${audioFilePath}`);

    // 6. (可选) 使用导出的鉴权信息重新初始化一个新的SDK实例
    if (exportedState) {
        console.log('\n--- 演示使用已保存的鉴权信息 ---');
        const sdk2 = new DoubaoSdk({
            workspace: __dirname,
            headless: false,
            storageState: exportedState
        });
        try {
            await sdk2.init();
            // 直接调用需要登录的功能，无需再次调用 login()
            console.log('使用已保存的会话初始化新SDK成功，无需再次登录。');
        } finally {
            await sdk2.destroy();
        }
    }

  } catch (error) {
    console.error('SDK 演示过程中发生错误:', error);
  } finally {
    // 5. 关闭浏览器，释放资源
    await sdk.destroy();
  }
}

runDemo().catch(console.error);
