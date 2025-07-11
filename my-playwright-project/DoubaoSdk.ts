import { chromium, Browser, BrowserContext, Page, Download } from 'playwright';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// 自定义错误类
export class DoubaoSdkError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'DoubaoSdkError';
    this.code = code;
    this.details = details;
    
    // 确保堆栈跟踪正确显示
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DoubaoSdkError);
    }
  }
}

export class InitializationError extends DoubaoSdkError {
  constructor(message: string, details?: any) {
    super(message, 'INITIALIZATION_ERROR', details);
    this.name = 'InitializationError';
  }
}

export class LoginError extends DoubaoSdkError {
  constructor(message: string, details?: any) {
    super(message, 'LOGIN_ERROR', details);
    this.name = 'LoginError';
  }
}

export class FileNotFoundError extends DoubaoSdkError {
  constructor(filePath: string, details?: any) {
    super(`文件不存在: ${filePath}`, 'FILE_NOT_FOUND', details);
    this.name = 'FileNotFoundError';
  }
}

export class TaskCreationError extends DoubaoSdkError {
  constructor(message: string, details?: any) {
    super(message, 'TASK_CREATION_ERROR', details);
    this.name = 'TaskCreationError';
  }
}

export class DownloadError extends DoubaoSdkError {
  constructor(message: string, details?: any) {
    super(message, 'DOWNLOAD_ERROR', details);
    this.name = 'DownloadError';
  }
}

export class TimeoutError extends DoubaoSdkError {
  constructor(message: string, timeoutMs: number, details?: any) {
    super(message, 'TIMEOUT_ERROR', { timeoutMs, ...details });
    this.name = 'TimeoutError';
  }
}

interface DoubaoSdkOptions {
  workspace: string;
  headless?: boolean;
  browserWSEndpoint?: string;
  storageState?: Awaited<ReturnType<BrowserContext['storageState']>>;
}

export interface PodcastDownloadResult {
  filePath: string;
  title: string;
}

export class DoubaoSdk {
  private options: DoubaoSdkOptions;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private storageState: Awaited<ReturnType<BrowserContext['storageState']>> | null = null;

  constructor(options: DoubaoSdkOptions) {
    this.options = {
      headless: false,
      ...options,
    };
    if (options.storageState) {
      this.storageState = options.storageState;
    }
    if (!fs.existsSync(this.options.workspace)) {
      fs.mkdirSync(this.options.workspace, { recursive: true });
    }
  }

  public getStorageState(): Awaited<ReturnType<BrowserContext['storageState']>> | null {
    return this.storageState;
  }

  async init(): Promise<void> {
    if (this.options.browserWSEndpoint) {
      console.log(`正在连接到远程浏览器: ${this.options.browserWSEndpoint}`);
      this.browser = await chromium.connect({ wsEndpoint: this.options.browserWSEndpoint });
    } else {
      console.log('正在启动本地浏览器...');
      this.browser = await chromium.launch({ headless: this.options.headless });
    }

    this.context = await this.browser.newContext({ storageState: this.storageState || undefined });
    this.page = await this.context.newPage();
    await this.page.goto('https://www.doubao.com/chat/');
    console.log('✅ SDK 初始化完成。');
    this.storageState = await this.context.storageState();
  }

  async login(onQRCode: (qrCodeBase64: string) => Promise<void>, timeout: number = 300000): Promise<{ status: 'LOGGED_IN' }> {
    if (!this.page || !this.context) {
      throw new InitializationError('SDK尚未初始化，请先调用 init() 方法。');
    }
    const page = this.page;
    try {
      // 检查是否已经登录
      try {
        await page.waitForSelector("[data-testid='chat_header_avatar_button']", { state: 'visible', timeout: 5000 });
        console.log('✅ 用户已登录。');
        this.storageState = await this.context.storageState();
        return { status: 'LOGGED_IN' };
      } catch (e) {
        // 未登录，继续执行获取二维码
        console.log('用户未登录，正在尝试获取二维码...');
      }

      await page.getByTestId('to_login_button').click();
      await page.getByTestId('qrcode_switcher').click({ position: { x: 51, y: 5 } });

      const qrCodeLocator = page.getByTestId('qrcode_image');
      await qrCodeLocator.waitFor({ state: 'visible', timeout: 10000 });

      const qrCodeSrc = await qrCodeLocator.getAttribute('src');
      if (!qrCodeSrc) {
        throw new LoginError('未能获取二维码图像的 src 属性。');
      }

      const base64Data = qrCodeSrc.replace(/^data:image\/png;base64,/, '');
      await onQRCode(base64Data);

      console.log('等待用户扫描二维码登录...');
      await page.waitForSelector("[data-testid='chat_header_avatar_button']", { state: 'visible', timeout });
      console.log('✅ 登录成功！正在保存会话信息到内存...');
      this.storageState = await this.context.storageState();
      console.log('会话已保存。');
      return { status: 'LOGGED_IN' };
    } catch (error) {
      console.error(`❌ 在 ${timeout / 1000} 秒内未检测到登录。`);
      throw new TimeoutError('登录确认超时', timeout, { originalError: error });
    }
  }

  async createPodcastTask(documentPath: string): Promise<string> {
    if (!this.page || !this.context) {
      throw new InitializationError('SDK尚未初始化或页面未创建，请先调用 init() 方法。');
    }
    if (!fs.existsSync(documentPath)) {
      throw new FileNotFoundError(documentPath);
    }
    const page = this.page;

    if (page.url() !== 'https://www.doubao.com/chat/') {
      console.log('当前不在主对话页面，将通过点击“新对话”按钮导航...');
      await page.getByTestId('create_conversation_button').click();
      await page.waitForURL('https://www.doubao.com/chat/');
    }

    console.log('导航至 AI 播客功能...');
    await page.getByTestId('skill_bar_button_more').click();
    await page.getByTestId('skill_bar_button_26').getByText('AI 播客').click();
    await page.getByTestId('upload_file_button').click();

    console.log(`准备上传文件: ${documentPath}`);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('upload_file_panel_upload_item').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(documentPath);
    console.log('文件已选择，准备发送...');

    await page.getByTestId('chat_input_send_button').click();

    console.log('等待任务页面加载...');
    await page.waitForURL(/\/chat\/\d+/);
    const url = page.url();
    const taskId = url.split('/').pop();
    if (!taskId) {
      throw new TaskCreationError('无法从URL中解析任务ID。', { url });
    }
    console.log(`任务已创建，ID: ${taskId}`);
    this.storageState = await this.context.storageState();
    return taskId;
  }

  async downloadPodcast(taskId: string): Promise<PodcastDownloadResult | null> {
    if (!this.page || !this.context) {
      throw new InitializationError('SDK尚未初始化或页面未创建，请先调用 init() 方法。');
    }
    const page = this.page;
    const taskUrl = `https://www.doubao.com/chat/${taskId}`;
    if (page.url() !== taskUrl) {
      await page.goto(taskUrl);
    } else {
      await page.reload({ waitUntil: 'networkidle' });
    }

    const cardLocator = page.locator('div[data-plugin-identifier="Symbol(receive-podcast-content)"]').last();
    const titleLocator = cardLocator.locator('[class*="title-"]');
    const downloadButtonLocator = cardLocator.locator('div[class*="actionBtn-"]:has(span[class*="downloadBtn"])');

    const reportTitle = (await titleLocator.innerText({ timeout: 5000 }).catch(() => '播客生成中...')).trim();
    console.log(`检查任务 '${reportTitle}' 的下载状态...`);

    const buttonClass = await downloadButtonLocator.getAttribute('class').catch(() => 'disabled');

    if (buttonClass && !buttonClass.includes('disabled')) {
      console.log(`✅ 成功！'${reportTitle}' 的下载按钮已激活。`);

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        downloadButtonLocator.click()
      ]);

      const extension = path.extname(download.suggestedFilename());
      const downloadsDir = path.join(this.options.workspace, 'downloads');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }

      let savePath: string;
      let fileBuffer: Buffer;

      if (this.options.browserWSEndpoint) {
        // 远程浏览器：使用流方式读取文件内容
        console.log('检测到远程浏览器，使用流方式下载文件...');
        
        const readableStream = await download.createReadStream();
        if (!readableStream) {
          throw new DownloadError('远程浏览器下载失败，无法创建读取流。');
        }

        // 将流转换为 Buffer
        const chunks: Buffer[] = [];
        for await (const chunk of readableStream) {
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);

        // 计算文件哈希
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const hexHash = hashSum.digest('hex');

        savePath = path.join(downloadsDir, `${hexHash}${extension}`);

        // 直接写入文件
        fs.writeFileSync(savePath, fileBuffer);
      } else {
        // 本地浏览器：使用原有逻辑
        console.log('检测到本地浏览器，使用临时文件方式...');
        
        const tempPath = await download.path();
        if (!tempPath) {
          throw new DownloadError('本地浏览器下载失败，未能获取临时文件路径。');
        }

        // 读取文件并计算哈希
        fileBuffer = fs.readFileSync(tempPath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const hexHash = hashSum.digest('hex');

        savePath = path.join(downloadsDir, `${hexHash}${extension}`);

        // 移动文件到最终位置
        fs.renameSync(tempPath, savePath);
      }

      console.log(`🚀 文件下载成功，已保存至: ${savePath}`);
      this.storageState = await this.context.storageState();
      return {
        filePath: savePath,
        title: reportTitle
      };
    } else {
      console.log("❌ 按钮仍处于禁用状态。");
      this.storageState = await this.context.storageState();
      return null;
    }
  }

  async generatePodcast(documentPath: string): Promise<PodcastDownloadResult> {
    const taskId = await this.createPodcastTask(documentPath);

    const maxRetries = 90;
    const pollIntervalSeconds = 10;

    for (let i = 0; i < maxRetries; i++) {
      console.log(`--- 第 ${i + 1}/${maxRetries} 次尝试下载 ---`);
      const downloadResult = await this.downloadPodcast(taskId);
      if (downloadResult) {
        return downloadResult;
      }

      if (i < maxRetries - 1) {
        console.log(`等待 ${pollIntervalSeconds} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
      }
    }

    const totalTimeoutMs = maxRetries * pollIntervalSeconds * 1000;
    throw new TimeoutError("轮询失败，已达到最大尝试次数。", totalTimeoutMs, { 
      maxRetries, 
      pollIntervalSeconds 
    });
  }

  async destroy(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      console.log('任务结束，关闭浏览器连接。');
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }
}
