import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Send, Loader2, Check, AlertCircle, FileText, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ArticleUploadProps {
  onSubmit?: (content: string, type: 'url' | 'text' | 'file') => void;
  onFileUpload?: (file: File, onProgress: (progress: number) => void) => Promise<void>;
  placeholder?: string;
  maxTextLength?: number;
  className?: string;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export function ArticleUpload({
  onSubmit,
  onFileUpload,
  placeholder = '输入URL、文本或拖拽文件到这里...',
  maxTextLength = 80,
  className
}: ArticleUploadProps) {
  const [value, setValue] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEmpty = value.trim().length === 0;
  const isUploading = uploadStatus === 'uploading';
  const hasUploadedFile = uploadedFile !== null;

  // 检测是否应该切换到多行模式
  useEffect(() => {
    const shouldBeMultiline = value.length > maxTextLength || value.includes('\n');
    setIsMultiline(shouldBeMultiline);
  }, [value, maxTextLength]);

  // 处理输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(e.target.value);
  }, []);

  // 处理提交
  const handleSubmit = useCallback(() => {
    if (isEmpty || isUploading) return;
    
    const trimmedValue = value.trim();
    let type: 'url' | 'text' = 'text';
    
    // 简单的URL检测
    if (trimmedValue.match(/^https?:\/\/.+/)) {
      type = 'url';
    }
    
    onSubmit?.(trimmedValue, type);
  }, [value, isEmpty, isUploading, onSubmit]);

  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    if (!onFileUpload) return;
    
    // 只允许PDF文件
    if (file.type !== 'application/pdf') {
      alert('只支持PDF文件格式');
      return;
    }
    
    setUploadStatus('uploading');
    setUploadProgress(0);
    setValue(file.name);
    setUploadedFile(file);
    
    const onProgress = (progress: number) => {
      setUploadProgress(progress);
    };
    
    onFileUpload(file, onProgress)
      .then(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
      })
      .catch(() => {
        setUploadStatus('error');
        // 错误时不清除文件，保持显示以便重试
        setTimeout(() => {
          setUploadProgress(0);
          // 注意：不重置 uploadStatus，保持 error 状态
        }, 3000);
      });
  }, [onFileUpload]);

  // 处理文件输入变化
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // 处理拖拽事件
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    const file = files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMultiline) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, isMultiline]);

  // 获取图标
  const getIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Loader2 className="animate-spin" />;
      case 'success':
        return <Check />;
      case 'error':
        return <RotateCcw />; // 错误状态显示重试按钮
      default:
        if (hasUploadedFile) {
          return <Send />; // 文件上传后显示发送按钮
        }
        return isEmpty ? <Paperclip /> : <Send />;
    }
  };

  // 处理取消文件
  const handleCancelFile = useCallback(() => {
    setUploadedFile(null);
    setValue('');
    setUploadStatus('idle');
    setUploadProgress(0);
    // 清空文件输入框
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 处理重试上传
  const handleRetry = useCallback(() => {
    if (uploadedFile && onFileUpload) {
      setUploadStatus('uploading');
      setUploadProgress(0);
      
      const onProgress = (progress: number) => {
        setUploadProgress(progress);
      };
      
      onFileUpload(uploadedFile, onProgress)
        .then(() => {
          setUploadStatus('idle');
          setUploadProgress(0);
        })
        .catch(() => {
          setUploadStatus('error');
          setTimeout(() => {
            setUploadProgress(0);
          }, 3000);
        });
    }
  }, [uploadedFile, onFileUpload]);

  // 获取图标按钮的点击处理
  const handleIconClick = () => {
    if (isUploading) return;
    
    if (uploadStatus === 'error') {
      handleRetry();
    } else if (isEmpty) {
      fileInputRef.current?.click();
    } else {
      handleSubmit();
    }
  };

  return (
    <div 
      className={cn(
        "relative group transition-all duration-300 ease-out overflow-hidden",
        "p-4 rounded-lg border-2 border-dashed",
        isDragOver 
          ? "border-blue-400 bg-blue-50/50" 
          : "border-gray-200 hover:border-gray-300",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 进度条背景层 */}
      {isUploading && (
        <div 
          className="absolute inset-0 z-0 transition-all duration-300 ease-out"
          style={{
            background: `linear-gradient(
              to right,
              rgba(59, 130, 246, 0.1) 0%,
              rgba(59, 130, 246, 0.2) ${uploadProgress}%,
              transparent ${uploadProgress}%
            )`
          }}
        >
          {/* 活跃款动画效果 */}
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              background: `linear-gradient(
                90deg,
                transparent,
                rgba(59, 130, 246, 0.3),
                transparent
              )`,
              transform: `translateX(${uploadProgress - 100}%)`,
              transition: 'transform 0.3s ease-out'
            }}
          />
          {/* 脉冲效果 */}
          <div 
            className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-400/10 to-cyan-400/10"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
      
      {/* 输入框 */}
      <div className="relative z-10 flex items-center gap-2">
          {/* PDF图标（左侧） */}
          {hasUploadedFile && (
            <div className="flex-shrink-0 flex items-center gap-1 p-2">
              <div className="relative">
                <FileText className="w-5 h-5" />
                {/* 错误状态指示器 */}
                {uploadStatus === 'error' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {isMultiline ? (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={3}
              className={cn(
                "flex-1 resize-none border-0 bg-transparent text-sm",
                "placeholder:text-gray-400 focus:outline-none",
                "transition-all duration-300 ease-out",
                hasUploadedFile ? "text-gray-600 cursor-not-allowed pl-1 pr-3 py-3" : "p-3"
              )}
              disabled={isUploading || hasUploadedFile}
              readOnly={hasUploadedFile}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "flex-1 border-0 bg-transparent text-sm",
                "placeholder:text-gray-400 focus:outline-none",
                "transition-all duration-300 ease-out",
                hasUploadedFile ? "text-gray-600 cursor-not-allowed pl-1 pr-3 py-3" : "p-3"
              )}
              disabled={isUploading || hasUploadedFile}
              readOnly={hasUploadedFile}
            />
          )}
          
          {/* 右侧按钮组 */}
          <div className={cn(
            "flex items-center gap-1 shrink-0",
            isMultiline ? "self-end mb-3" : "self-center"
          )}>
            {/* X取消按钮 */}
            {hasUploadedFile && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-red-100 transition-all duration-150"
                onClick={handleCancelFile}
                disabled={isUploading}
              >
                <X className="w-4 h-4 text-gray-500 hover:text-red-600" />
              </Button>
            )}
            
            {/* 主功能按钮 */}
            <Button
              size="icon"
              variant={isEmpty ? "ghost" : "default"}
              className={cn(
                "h-8 w-8 transition-all duration-150",
                isUploading && "animate-pulse",
                uploadStatus === 'success' && "bg-green-500 hover:bg-green-600",
                uploadStatus === 'error' && "bg-red-500 hover:bg-red-600"
              )}
              onClick={handleIconClick}
              disabled={isUploading}
            >
              {getIcon()}
            </Button>
          </div>
        </div>
      
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
        accept=".pdf"
      />
      
      {/* 拖拽提示 */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-50/80 rounded-lg">
          <div className="text-blue-600 font-medium">
            松开以上传文件
          </div>
        </div>
      )}
      
    </div>
  );
}

export default ArticleUpload;
