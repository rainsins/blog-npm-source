// Artalk 文件分享插件 (兼容 Artalk V3) - Telegram 风格 - 支持黑夜模式
(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    // Browser globals
    root = typeof globalThis !== 'undefined' ? globalThis : root || self;
    factory(root['artalk-plugin-file'] = root['artalk-plugin-file'] || {});
  }
})(this, function(exports) {
  'use strict';

  const ArtalkFileSharePlugin = (artalk) => {
    // 文件分享语法正则表达式: [file: URL : 文件名 : 文件大小]
    const FILE_REGEX = /\[file:\s*([^:\]]+)\s*:\s*([^:\]]*)\s*:\s*([^\]]*)\]/g;

    // 支持的文件类型和图标映射
    const fileIcons = {
      // 文档类
      'pdf': '📄',
      'doc': '📝', 'docx': '📝',
      'txt': '📄', 'md': '📄',
      'rtf': '📝',
      // 表格类
      'xls': '📊', 'xlsx': '📊',
      'csv': '📊',
      // 演示文稿
      'ppt': '📋', 'pptx': '📋',
      // 图片类
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
      'bmp': '🖼️', 'svg': '🖼️', 'webp': '🖼️',
      // 音频类
      'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
      'ogg': '🎵', 'm4a': '🎵', 'aac': '🎵',
      // 视频类
      'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬',
      'mov': '🎬', 'wmv': '🎬', 'flv': '🎬',
      // 压缩包
      'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️',
      'tar': '🗜️', 'gz': '🗜️',
      // 代码类
      'js': '💾', 'css': '💾', 'html': '💾',
      'json': '💾', 'xml': '💾', 'sql': '💾',
      'py': '💾', 'php': '💾', 'java': '💾',
      // 其他
      'exe': '⚙️', 'msi': '⚙️',
      'apk': '📱', 'ipa': '📱',
      // 默认
      'default': '📎'
    };

    const getFileIcon = (filename) => {
      if (!filename) return fileIcons.default;
      
      const ext = filename.toLowerCase().split('.').pop();
      return fileIcons[ext] || fileIcons.default;
    };

    const getFileType = (filename) => {
      if (!filename) return 'FILE';
      
      const ext = filename.toLowerCase().split('.').pop();
      
      // 文件类型分类
      const types = {
        'pdf': 'PDF',
        'doc': 'DOC', 'docx': 'DOC',
        'txt': 'TXT', 'md': 'MD',
        'xls': 'XLS', 'xlsx': 'XLS',
        'ppt': 'PPT', 'pptx': 'PPT',
        'jpg': 'JPG', 'jpeg': 'JPG', 'png': 'PNG', 'gif': 'GIF',
        'mp3': 'MP3', 'wav': 'WAV', 'flac': 'FLAC',
        'mp4': 'MP4', 'avi': 'AVI', 'mkv': 'MKV',
        'zip': 'ZIP', 'rar': 'RAR', '7z': '7Z',
        'js': 'JS', 'css': 'CSS', 'html': 'HTML',
        'exe': 'EXE', 'apk': 'APK'
      };
      
      return types[ext] || ext.toUpperCase();
    };

    const formatFileSize = (sizeStr) => {
      if (!sizeStr || sizeStr.trim() === '') return '未知大小';
      
      // 如果已经是格式化的大小，直接返回
      if (/^\d+\.?\d*\s*(B|KB|MB|GB|TB)$/i.test(sizeStr.trim())) {
        return sizeStr.trim();
      }
      
      // 如果是纯数字，假设为字节
      const bytes = parseInt(sizeStr);
      if (isNaN(bytes)) return sizeStr;
      
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let unitIndex = 0;
      
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      
      return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    };

    const createFileShare = (src, filename = '', filesize = '') => {
      // 处理相对路径，自动添加 https:
      if (src.startsWith('//')) {
        src = 'https:' + src;
      }

      // 如果没有提供文件名，从URL中提取
      if (!filename || filename.trim() === '') {
        try {
          const urlParts = decodeURIComponent(src).split('/');
          filename = urlParts[urlParts.length - 1];
          if (!filename || filename.includes('?')) {
            filename = filename.split('?')[0] || '未知文件';
          }
        } catch (e) {
          console.error("Error parsing filename from URL:", e);
          filename = "未知文件";
        }
      }

      const fileIcon = getFileIcon(filename);
      const fileType = getFileType(filename);
      const formattedSize = formatFileSize(filesize);
      const fileId = 'file-' + Math.random().toString(36).substr(2, 9);
      
      return `
        <div class="artalk-file-share" data-src="${src}" data-id="${fileId}">
          <div class="file-container">
            <div class="file-icon">
              <span class="icon-emoji">${fileIcon}</span>
              <span class="file-type-badge">${fileType}</span>
            </div>
            <div class="file-info">
              <div class="file-name" title="${filename}">${filename}</div>
              <div class="file-meta">
                <span class="file-size">${formattedSize}</span>
                <span class="file-status">点击下载</span>
              </div>
            </div>
            <div class="file-actions">
              <button class="download-btn" aria-label="下载文件">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    };

    const addStyles = () => {
      const styleId = 'artalk-file-share-styles';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* 白天模式样式 */
        html[data-mode="light"] .artalk-file-share,
        .artalk-file-share {
          margin: 12px 0;
          border-radius: 12px;
          overflow: hidden;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          transition: all 0.2s ease;
          cursor: pointer;
          user-select: none;
        }
        
        html[data-mode="light"] .artalk-file-share:hover,
        .artalk-file-share:hover {
          background: #f1f3f4;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        html[data-mode="light"] .artalk-file-share:active,
        .artalk-file-share:active {
          background: #e9ecef;
        }
        
        html[data-mode="light"] .file-container,
        .file-container {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          gap: 12px;
        }
        
        html[data-mode="light"] .file-icon,
        .file-icon {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #dee2e6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        html[data-mode="light"] .icon-emoji,
        .icon-emoji {
          font-size: 20px;
          line-height: 1;
        }
        
        html[data-mode="light"] .file-type-badge,
        .file-type-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: #007bff;
          color: white;
          font-size: 8px;
          font-weight: bold;
          padding: 1px 3px;
          border-radius: 3px;
          line-height: 1;
          min-width: 16px;
          text-align: center;
        }
        
        html[data-mode="light"] .file-info,
        .file-info {
          flex: 1;
          min-width: 0;
        }
        
        html[data-mode="light"] .file-name,
        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: #212529;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }
        
        html[data-mode="light"] .file-meta,
        .file-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #6c757d;
        }
        
        html[data-mode="light"] .file-size,
        .file-size {
          font-weight: 500;
        }
        
        html[data-mode="light"] .file-status,
        .file-status {
          color: #007bff;
        }
        
        html[data-mode="light"] .file-actions,
        .file-actions {
          flex-shrink: 0;
        }
        
        html[data-mode="light"] .download-btn,
        .download-btn {
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        html[data-mode="light"] .download-btn:hover,
        .download-btn:hover {
          background: rgba(0, 123, 255, 0.1);
          color: #007bff;
        }
        
        html[data-mode="light"] .artalk-file-error,
        .artalk-file-error {
          color: #dc3545;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          margin: 8px 0;
        }

        /* 黑夜模式样式 */
        html[data-mode="dark"] .artalk-file-share {
          margin: 12px 0;
          border-radius: 12px;
          overflow: hidden;
          background: #2d3748;
          border: 1px solid #4a5568;
          transition: all 0.2s ease;
          cursor: pointer;
          user-select: none;
        }
        
        html[data-mode="dark"] .artalk-file-share:hover {
          background: #374151;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        html[data-mode="dark"] .artalk-file-share:active {
          background: #4a5568;
        }
        
        html[data-mode="dark"] .file-icon {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: #1a202c;
          border: 1px solid #4a5568;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        html[data-mode="dark"] .file-type-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: #63b3ed;
          color: #1a202c;
          font-size: 8px;
          font-weight: bold;
          padding: 1px 3px;
          border-radius: 3px;
          line-height: 1;
          min-width: 16px;
          text-align: center;
        }
        
        html[data-mode="dark"] .file-name {
          font-size: 14px;
          font-weight: 500;
          color: #e2e8f0;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }
        
        html[data-mode="dark"] .file-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #a0aec0;
        }
        
        html[data-mode="dark"] .file-size {
          font-weight: 500;
        }
        
        html[data-mode="dark"] .file-status {
          color: #63b3ed;
        }
        
        html[data-mode="dark"] .download-btn {
          background: none;
          border: none;
          color: #a0aec0;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        html[data-mode="dark"] .download-btn:hover {
          background: rgba(99, 179, 237, 0.15);
          color: #63b3ed;
        }
        
        html[data-mode="dark"] .artalk-file-error {
          color: #fed7d7;
          background: #742a2a;
          border: 1px solid #9b2c2c;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          margin: 8px 0;
        }

        /* 下载动画 */
        .artalk-file-share.downloading .file-status {
          color: #28a745;
        }
        
        html[data-mode="dark"] .artalk-file-share.downloading .file-status {
          color: #68d391;
        }
        
        .artalk-file-share.downloading .download-btn {
          animation: downloadPulse 1s infinite;
        }
        
        @keyframes downloadPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        /* 响应式设计 */
        @media (max-width: 480px) {
          .file-container {
            padding: 10px 12px !important;
            gap: 10px !important;
          }
          
          .file-icon {
            width: 40px !important;
            height: 40px !important;
          }
          
          .icon-emoji {
            font-size: 16px !important;
          }
          
          .file-name {
            font-size: 13px !important;
          }
          
          .file-meta {
            font-size: 11px !important;
          }
        }
      `;
      document.head.appendChild(style);
    };

    const handleFileClick = (fileElement) => {
      const src = fileElement.dataset.src;
      if (!src) return;

      // 添加下载状态
      fileElement.classList.add('downloading');
      const statusEl = fileElement.querySelector('.file-status');
      const originalStatus = statusEl.textContent;
      statusEl.textContent = '下载中...';

      // 创建下载链接
      const link = document.createElement('a');
      link.href = src;
      link.download = '';
      link.target = '_blank';
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 恢复状态
      setTimeout(() => {
        fileElement.classList.remove('downloading');
        statusEl.textContent = '下载完成';
        
        setTimeout(() => {
          statusEl.textContent = originalStatus;
        }, 2000);
      }, 1000);
    };

    const initFileShare = (fileElement) => {
      if (fileElement.dataset.inited) return;

      // 点击整个文件区域下载
      fileElement.addEventListener('click', (e) => {
        e.preventDefault();
        handleFileClick(fileElement);
      });

      // 阻止下载按钮的事件冒泡
      const downloadBtn = fileElement.querySelector('.download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleFileClick(fileElement);
        });
      }

      fileElement.dataset.inited = 'true';
    };

    // 处理文件分享语法的核心函数
    const processFileSyntax = () => {
      // 确保 jQuery 可用
      if (typeof $ === 'undefined') {
        console.error('[artalk-plugin-file] jQuery is required');
        return;
      }

      // 查找所有评论内容容器
      $('.atk-content, .atk-editor-plug-preview').each(function() {
        const $content = $(this);
        
        // 遍历所有 p 元素
        $content.find('p').each(function() {
          const $p = $(this);
          let html = $p.html();
          let hasReplacement = false;

          // 查找并替换文件分享语法
          html = html.replace(FILE_REGEX, (match, src, filename, filesize) => {
            hasReplacement = true;
            src = src.trim();
            filename = filename.trim();
            filesize = filesize.trim();

            console.log('[artalk-plugin-file] 发现文件分享语法:', { src, filename, filesize });

            return createFileShare(src, filename, filesize);
          });

          // 如果有替换，更新 DOM
          if (hasReplacement) {
            $p.html(html);
          }
        });
      });

      // 初始化所有新创建的文件分享组件
      $('.artalk-file-share:not([data-inited])').each(function() {
        initFileShare(this);
      });
    };

    // 初始化插件
    const init = () => {
      addStyles();
      
      // 监听评论列表加载事件
      artalk.on('list-loaded', () => {
        setTimeout(processFileSyntax, 100); // 稍微延迟确保 DOM 完全渲染
      });

      // 监听评论更新事件（如果有的话）
      artalk.on('comment-rendered', () => {
        setTimeout(processFileSyntax, 100);
      });

      // 初始处理已存在的内容
      setTimeout(processFileSyntax, 500);
      
      console.log('[artalk-plugin-file] 插件已加载 - Telegram 风格文件分享 (支持黑夜模式)');
    };

    // 延迟初始化，确保 Artalk 完全加载
    if (artalk.getEl()) {
      init();
    } else {
      artalk.on('mounted', init);
    }
  };

  // 浏览器环境自动注册
  if (typeof window !== 'undefined') {
    if (!window.ArtalkPlugins) {
      window.ArtalkPlugins = {};
    }
    window.ArtalkPlugins.ArtalkFileSharePlugin = ArtalkFileSharePlugin;
    
    if (window.Artalk) {
      window.Artalk.use(ArtalkFileSharePlugin);
    }
  }

  exports.ArtalkFileSharePlugin = ArtalkFileSharePlugin;
  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
});