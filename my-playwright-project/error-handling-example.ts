import { 
  DoubaoSdk, 
  DoubaoSdkError, 
  InitializationError, 
  LoginError, 
  FileNotFoundError, 
  TaskCreationError, 
  DownloadError, 
  TimeoutError 
} from './DoubaoSdk.js';

async function exampleErrorHandling() {
  const sdk = new DoubaoSdk({
    workspace: './workspace'
  });

  try {
    await sdk.init();
    
    // 示例：处理登录
    await sdk.login(async (qrCode: string) => {
      console.log('请扫描二维码登录');
      // 处理二维码显示逻辑
    }, 60000); // 60秒超时
    
    // 示例：生成播客
    const podcastPath = await sdk.generatePodcast('./document.pdf');
    console.log(`播客已生成: ${podcastPath}`);
    
  } catch (error: unknown) {
    // 根据错误类型进行不同的处理
    if (error instanceof InitializationError) {
      console.error('❌ 初始化错误:', error.message);
      console.error('错误代码:', error.code);
      console.error('详细信息:', error.details);
      
    } else if (error instanceof LoginError) {
      console.error('❌ 登录错误:', error.message);
      console.error('错误代码:', error.code);
      // 可能需要重新获取二维码或检查网络连接
      
    } else if (error instanceof FileNotFoundError) {
      console.error('❌ 文件未找到:', error.message);
      console.error('错误代码:', error.code);
      // 提示用户检查文件路径
      
    } else if (error instanceof TaskCreationError) {
      console.error('❌ 任务创建失败:', error.message);
      console.error('错误代码:', error.code);
      console.error('详细信息:', error.details);
      // 可能需要重试或检查上传的文件格式
      
    } else if (error instanceof DownloadError) {
      console.error('❌ 下载失败:', error.message);
      console.error('错误代码:', error.code);
      // 可能需要重试下载
      
    } else if (error instanceof TimeoutError) {
      console.error('❌ 操作超时:', error.message);
      console.error('错误代码:', error.code);
      console.error('超时时长:', error.details?.timeoutMs, 'ms');
      console.error('详细信息:', error.details);
      // 可能需要增加超时时间或检查网络状况
      
    } else if (error instanceof DoubaoSdkError) {
      // 捕获所有其他自定义错误
      console.error('❌ DoubaoSdk 错误:', error.message);
      console.error('错误代码:', error.code);
      console.error('详细信息:', error.details);
      
    } else {
      // 处理其他未预期的错误
      console.error('❌ 未知错误:', error);
    }
  } finally {
    await sdk.destroy();
  }
}

// 示例：错误信息检查函数
function isRetryableError(error: Error): boolean {
  if (error instanceof TimeoutError) {
    return true; // 超时错误通常可以重试
  }
  if (error instanceof DownloadError) {
    return true; // 下载错误可以重试
  }
  if (error instanceof LoginError) {
    return false; // 登录错误通常需要用户干预
  }
  if (error instanceof FileNotFoundError) {
    return false; // 文件不存在错误无法通过重试解决
  }
  return false;
}

// 示例：带重试逻辑的错误处理
async function generatePodcastWithRetry(sdk: DoubaoSdk, documentPath: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sdk.generatePodcast(documentPath);
    } catch (error) {
      lastError = error as Error;
      
      if (!isRetryableError(error as Error)) {
        throw error; // 不可重试的错误直接抛出
      }
      
      if (i === maxRetries - 1) {
        break; // 最后一次尝试，不再重试
      }
      
      console.log(`❌ 第 ${i + 1} 次尝试失败，将在 5 秒后重试...`);
      console.log(`错误信息: ${(error as Error).message}`);
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  throw lastError!;
}

export { exampleErrorHandling, isRetryableError, generatePodcastWithRetry };
