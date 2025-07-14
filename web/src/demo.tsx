import React from 'react';
import ArticleUpload from './components/ArticleUpload1';

function Demo() {
  // 模拟提交处理
  const handleSubmit = (content: string, type: 'url' | 'text' | 'file') => {
    console.log('提交内容:', { content, type });
    alert(`提交成功！\n类型: ${type}\n内容: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
  };

  // 模拟文件上传处理
  const handleFileUpload = async (file: File, onProgress: (progress: number) => void): Promise<void> => {
    console.log('开始上传文件:', file.name);
    
    // 模拟上传进度
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          onProgress(progress);
          
          // 模拟上传成功/失败
          if (Math.random() > 0.7) { // 80% 成功率
            setTimeout(() => resolve(), 500);
          } else {
            setTimeout(() => reject(new Error('上传失败')), 500);
          }
        } else {
          onProgress(progress);
        }
      }, 200);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            文章上传组件演示
          </h1>
          <p className="text-gray-600">
            支持URL、文本输入和文件拖拽上传，具有自适应输入框和动画进度条
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4">基础用法</h2>
          <ArticleUpload
            onSubmit={handleSubmit}
            onFileUpload={handleFileUpload}
            placeholder="试试输入URL、长文本，或者拖拽文件到这里..."
            maxTextLength={36}
          />
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-4">自定义样式</h2>
          <ArticleUpload
            onSubmit={handleSubmit}
            onFileUpload={handleFileUpload}
            placeholder="这是一个自定义样式的组件"
            maxTextLength={40}
            className="border-green-200 hover:border-green-300"
          />
        </div>

        <div className="bg-gray-100 p-6 rounded-lg">
          <h3 className="font-semibold mb-2">功能说明：</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 输入短内容时显示单行输入框</li>
            <li>• 输入长内容或换行时自动切换为多行输入框</li>
            <li>• 空内容时显示回形针图标，点击选择文件</li>
            <li>• 有内容时显示发送图标，点击提交</li>
            <li>• 支持拖拽文件到组件区域</li>
            <li>• 上传时显示动画进度条效果</li>
            <li>• 单行模式下按Enter提交，多行模式下Shift+Enter换行</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Demo;
