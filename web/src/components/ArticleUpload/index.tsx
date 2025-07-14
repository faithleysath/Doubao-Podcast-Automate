import { cn } from "@/lib/utils";
import { AlertCircle, Check, FileText, Loader2, Paperclip, RotateCcw, Send, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";

interface ArticleUploadProps {
    onSubmit: (type: 'url' | 'text' | 'file', content: string | File, onProgress: (progress: number) => void) => Promise<void>;
    placeholder: string;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function ArticleUpload({
    onSubmit,
    placeholder
}: ArticleUploadProps) {
    const [textValue, setTextValue] = useState('');
    const [file, setFile] = useState<File|null>(null);
    const [isMultiline, setIsMultiline] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const primaryBtnIcon = useMemo(() => {
    switch (uploadStatus) {
        case 'idle':
            return !textValue ? <Paperclip /> : <Send />
        case 'uploading':
            return <Loader2 className="animate-spin" />
        case 'success':
            return <Check />
        case 'error':
            return <RotateCcw />
    }
}, [uploadStatus, textValue]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTextValue(e.target.value);
    }, []);

    // 处理取消文件
    const handleCancelFile = useCallback(() => {
        setFile(null);
        setTextValue('');
        // 清空文件输入框
    }, []);

    // 处理主要按钮
    const handlePrimaryButton = useCallback(() => {

    }, []);

    // 处理文件输入框变化
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        
    }, [])
    
    return (
        <div
            className={cn(
                "relative group transition-all duration-300 ease-out overflow-hidden",
                "p-4 rounded-md border-1",
                isDragOver
                ? "border-blue-400 bg-blue-50/50"
                : "border-gray-200 hover:border-gray-300"
            )}
        >
            {/* 进度条背景 */}
            {uploadStatus === 'uploading' && (
                <div
                    className={cn(
                        "absolute inset-0 z-0 transistion-all duration-300 ease-out bg-blue-400"
                    )}
                    style={{
                        width: `${uploadProgress}%`
                    }}
                />
            )}

            {/* 输入框容器 */}
            <div className="relative z-10 flex items-center gap-2">
                {/* PDF图标（左侧） */}
                {file && (
                    <div className="flex-shrink-0 flex items-center justify-center gap-1 p-2">
                        <div className="relative">
                            <FileText className="w-5 h-5" />
                            {/* 错误指示器 */}
                            {uploadStatus === 'error' && (
                                <div className="absolute -top1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                                    <AlertCircle className="w-2 h-2 text-white" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 输入框 */}
                <textarea
                    name="article-upload-textarea"
                    ref={textareaRef}
                    value={textValue}
                    placeholder={placeholder}
                    onChange={handleInputChange}
                    className={cn(
                        "flex-1 resize-none border-0 bg-transparent text-sm",
                        "placeholder:text-gray-400 focus:outline-none",
                        "transition-all duration-300 ease-out",
                        file ? "text-gray-600 cursor-not-allowed select-none pl-1 pr-3 py-3" : 'pt-3'
                    )}
                    disabled={uploadStatus === 'uploading' || !!file}
                    readOnly={!!file}
                    style={{
                        height: textareaRef.current?.scrollHeight,
                        boxSizing: 'border-box'
                    }}
                />

                {/* 右侧按钮组 */}
                <div className={cn(
                    "flex items-center gap-1 shrink-0",
                )}>
                    {/* 取消文件按钮 */}
                    {file && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-red-100 transition-all duration-150"
                            onClick={handleCancelFile}
                            disabled={uploadStatus==='uploading'}
                        >
                            <X className="w-4 h-4 text-gray-500 hover:text-red-600" />
                        </Button>
                    )}

                    {/* 主功能按钮 */}
                    <Button
                        size='icon'
                        variant={!textValue ? 'ghost' : 'default'}
                        className={cn(
                            "h-8 w-8 transition-all duration-150 cursor-pointer",
                            uploadStatus === 'uploading' && 'animate-pulse',
                            uploadStatus === 'success' && "bg-green-500 hover:bg-green-600",
                            uploadStatus === 'error' && "bg-red-500 hover:bg-red-600"
                        )}
                        onClick={handlePrimaryButton}
                        disabled={uploadStatus==='uploading'}
                    >
                        {primaryBtnIcon}
                    </Button>
                </div>
            </div>

            {/* 隐藏的文件输入 */}
            < input
                ref={fileInputRef}
                type='file'
                className="hidden"

        </div>
    )
}