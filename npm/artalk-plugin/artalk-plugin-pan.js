// Artalk 网盘链接展示插件 (兼容 Artalk V3) - 支持多种网盘平台 - 支持黑夜模式
(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    // Browser globals
    root = typeof globalThis !== 'undefined' ? globalThis : root || self;
    factory(root['artalk-plugin-netdisk'] = root['artalk-plugin-netdisk'] || {});
  }
})(this, function(exports) {
  'use strict';

  const ArtalkNetdiskPlugin = (artalk) => {
    // 网盘链接语法正则表达式: [netdisk: 平台 : URL : 提取码 : 标题 : 描述]
    const NETDISK_REGEX = /\[netdisk:\s*([^:\]]+)\s*:\s*([^:\]]+)\s*:\s*([^:\]]*)\s*:\s*([^:\]]*)\s*:\s*([^\]]*)\]/g;

    // 支持的网盘平台配置
    const netdiskConfig = {
      'baidu': {
        name: '百度网盘',
        icon: '🌐',
        color: '#2932e1',
        darkColor: '#4285f4',
        domain: 'pan.baidu.com',
        pattern: /pan\.baidu\.com/i,
        defaultTitle: '百度网盘分享'
      },
      'aliyun': {
        name: '阿里云盘',
        icon: '☁️',
        color: '#ff6a00',
        darkColor: '#ff8533',
        domain: 'aliyundrive.com',
        pattern: /aliyundrive\.com|alipan\.com/i,
        defaultTitle: '阿里云盘分享'
      },
      'onedrive': {
        name: 'OneDrive',
        icon: '🔷',
        color: '#0078d4',
        darkColor: '#40a6ff',
        domain: '1drv.ms',
        pattern: /1drv\.ms|onedrive\.live\.com/i,
        defaultTitle: 'OneDrive 分享'
      },
      'googledrive': {
        name: 'Google Drive',
        icon: '🌈',
        color: '#4285f4',
        darkColor: '#66a3ff',
        domain: 'drive.google.com',
        pattern: /drive\.google\.com/i,
        defaultTitle: 'Google Drive 分享'
      },
      'dropbox': {
        name: 'Dropbox',
        icon: '📦',
        color: '#0061ff',
        darkColor: '#4d94ff',
        domain: 'dropbox.com',
        pattern: /dropbox\.com/i,
        defaultTitle: 'Dropbox 分享'
      },
      'lanzou': {
        name: '蓝奏云',
        icon: '💙',
        color: '#1890ff',
        darkColor: '#52c3ff',
        domain: 'lanzou.com',
        pattern: /lanzou[a-z]\.com|lanzn\.com|lanzoui\.com|lanzous\.com/i,
        defaultTitle: '蓝奏云分享'
      },
      'weiyun': {
        name: '微云',
        icon: '🔷',
        color: '#07c160',
        darkColor: '#4dd78a',
        domain: 'weiyun.com',
        pattern: /weiyun\.com/i,
        defaultTitle: '腾讯微云分享'
      },
      '123pan': {
        name: '123云盘',
        icon: '📁',
        color: '#ff6b35',
        darkColor: '#ff8f66',
        domain: '123pan.com',
        pattern: /123pan\.com/i,
        defaultTitle: '123云盘分享'
      },
      'quark': {
        name: '夸克网盘',
        icon: '⚡',
        color: '#5b5fef',
        darkColor: '#8b8fff',
        domain: 'pan.quark.cn',
        pattern: /pan\.quark\.cn/i,
        defaultTitle: '夸克网盘分享'
      },
      'generic': {
        name: '网盘',
        icon: '💾',
        color: '#6c757d',
        darkColor: '#a0aec0',
        domain: '',
        pattern: null,
        defaultTitle: '网盘分享'
      }
    };

    const detectNetdiskType = (url) => {
      for (const [key, config] of Object.entries(netdiskConfig)) {
        if (config.pattern && config.pattern.test(url)) {
          return key;
        }
      }
      return 'generic';
    };

    const createNetdiskCard = (platform, url, password = '', title = '', description = '') => {
      // 处理相对路径，自动添加 https:
      if (url.startsWith('//')) {
        url = 'https:' + url;
      }

      // 自动检测网盘类型（如果平台为空或不存在）
      if (!platform || !netdiskConfig[platform]) {
        platform = detectNetdiskType(url);
      }

      const config = netdiskConfig[platform] || netdiskConfig['generic'];
      
      if (!title || title.trim() === '') {
        title = config.defaultTitle;
      }

      const cardId = 'netdisk-' + Math.random().toString(36).substr(2, 9);
      const hasPassword = password && password.trim() !== '';
      const hasDescription = description && description.trim() !== '';
      
      return `
        <div class="artalk-netdisk-card" data-platform="${platform}" data-url="${url}" data-id="${cardId}">
          <div class="netdisk-container">
            <div class="netdisk-header">
              <div class="netdisk-icon">
                <span class="platform-emoji">${config.icon}</span>
              </div>
              <div class="netdisk-info">
                <div class="netdisk-title" title="${title}">${title}</div>
                <div class="netdisk-platform">${config.name}</div>
              </div>
              <div class="netdisk-actions">
                <button class="copy-btn" data-copy="url" aria-label="复制链接" title="复制链接">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                  </svg>
                </button>
                <button class="open-btn" aria-label="打开链接" title="打开链接">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                  </svg>
                </button>
              </div>
            </div>
            ${hasPassword ? `
              <div class="netdisk-password">
                <div class="password-label">提取码:</div>
                <div class="password-value">
                  <code class="password-code">${password}</code>
                  <button class="copy-btn small" data-copy="password" aria-label="复制提取码" title="复制提取码">
                    <svg viewBox="0 0 24 24" width="12" height="12">
                      <path fill="currentColor" d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ` : ''}
            ${hasDescription ? `
              <div class="netdisk-description">${description}</div>
            ` : ''}
            <div class="netdisk-footer">
              <div class="netdisk-domain">${config.domain || new URL(url).hostname}</div>
              <div class="netdisk-status">点击访问</div>
            </div>
          </div>
        </div>
      `;
    };

    const addStyles = () => {
      const styleId = 'artalk-netdisk-plugin-styles';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* 白天模式样式 */
        html[data-mode="light"] .artalk-netdisk-card,
        .artalk-netdisk-card {
          margin: 14px 0;
          background: #ffffff;
          border: 1px solid #e1e5e9;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        html[data-mode="light"] .artalk-netdisk-card:hover,
        .artalk-netdisk-card:hover {
          border-color: #d0d7de;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-1px);
        }
        
        html[data-mode="light"] .netdisk-container,
        .netdisk-container {
          padding: 16px;
        }
        
        html[data-mode="light"] .netdisk-header,
        .netdisk-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        html[data-mode="light"] .netdisk-icon,
        .netdisk-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background: #f6f8fa;
          border: 1px solid #d0d7de;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        html[data-mode="light"] .platform-emoji,
        .platform-emoji {
          font-size: 20px;
          line-height: 1;
        }
        
        html[data-mode="light"] .netdisk-info,
        .netdisk-info {
          flex: 1;
          min-width: 0;
        }
        
        html[data-mode="light"] .netdisk-title,
        .netdisk-title {
          font-size: 15px;
          font-weight: 600;
          color: #24292f;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.4;
        }
        
        html[data-mode="light"] .netdisk-platform,
        .netdisk-platform {
          font-size: 12px;
          color: #656d76;
          font-weight: 500;
        }
        
        html[data-mode="light"] .netdisk-actions,
        .netdisk-actions {
          display: flex;
          gap: 4px;
        }
        
        html[data-mode="light"] .copy-btn,
        html[data-mode="light"] .open-btn,
        .copy-btn,
        .open-btn {
          background: none;
          border: none;
          color: #656d76;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        html[data-mode="light"] .copy-btn:hover,
        html[data-mode="light"] .open-btn:hover,
        .copy-btn:hover,
        .open-btn:hover {
          background: #f3f4f6;
          color: #24292f;
        }
        
        html[data-mode="light"] .copy-btn.small,
        .copy-btn.small {
          padding: 4px;
        }
        
        html[data-mode="light"] .netdisk-password,
        .netdisk-password {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #f6f8fa;
          border: 1px solid #d0d7de;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 13px;
        }
        
        html[data-mode="light"] .password-label,
        .password-label {
          color: #656d76;
          font-weight: 500;
          flex-shrink: 0;
        }
        
        html[data-mode="light"] .password-value,
        .password-value {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
        }
        
        html[data-mode="light"] .password-code,
        .password-code {
          background: #ffffff;
          border: 1px solid #d0d7de;
          border-radius: 4px;
          padding: 4px 8px;
          font-family: 'SFMono-Regular', 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          color: #0969da;
          font-weight: 600;
          user-select: all;
        }
        
        html[data-mode="light"] .netdisk-description,
        .netdisk-description {
          font-size: 13px;
          color: #656d76;
          line-height: 1.5;
          margin-bottom: 12px;
          padding-left: 4px;
        }
        
        html[data-mode="light"] .netdisk-footer,
        .netdisk-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #8b949e;
        }
        
        html[data-mode="light"] .netdisk-domain,
        .netdisk-domain {
          font-family: 'SFMono-Regular', 'Monaco', 'Menlo', monospace;
        }
        
        html[data-mode="light"] .netdisk-status,
        .netdisk-status {
          font-weight: 500;
        }

        /* 黑夜模式样式 */
        html[data-mode="dark"] .artalk-netdisk-card {
          margin: 14px 0;
          background: #21262d;
          border: 1px solid #30363d;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        
        html[data-mode="dark"] .artalk-netdisk-card:hover {
          border-color: #484f58;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transform: translateY(-1px);
        }
        
        html[data-mode="dark"] .netdisk-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background: #161b22;
          border: 1px solid #30363d;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        html[data-mode="dark"] .netdisk-title {
          font-size: 15px;
          font-weight: 600;
          color: #f0f6fc;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.4;
        }
        
        html[data-mode="dark"] .netdisk-platform {
          font-size: 12px;
          color: #8b949e;
          font-weight: 500;
        }
        
        html[data-mode="dark"] .copy-btn,
        html[data-mode="dark"] .open-btn {
          background: none;
          border: none;
          color: #8b949e;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        html[data-mode="dark"] .copy-btn:hover,
        html[data-mode="dark"] .open-btn:hover {
          background: #30363d;
          color: #f0f6fc;
        }
        
        html[data-mode="dark"] .netdisk-password {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 13px;
        }
        
        html[data-mode="dark"] .password-label {
          color: #8b949e;
          font-weight: 500;
          flex-shrink: 0;
        }
        
        html[data-mode="dark"] .password-code {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 4px;
          padding: 4px 8px;
          font-family: 'SFMono-Regular', 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          color: #58a6ff;
          font-weight: 600;
          user-select: all;
        }
        
        html[data-mode="dark"] .netdisk-description {
          font-size: 13px;
          color: #8b949e;
          line-height: 1.5;
          margin-bottom: 12px;
          padding-left: 4px;
        }
        
        html[data-mode="dark"] .netdisk-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #6e7681;
        }
        
        html[data-mode="dark"] .netdisk-domain {
          font-family: 'SFMono-Regular', 'Monaco', 'Menlo', monospace;
        }
        
        html[data-mode="dark"] .netdisk-status {
          font-weight: 500;
        }

        /* 平台特色主题色 */
        .artalk-netdisk-card[data-platform="baidu"] .netdisk-icon {
          background: linear-gradient(135deg, #2932e1, #4285f4);
          border-color: #2932e1;
        }
        
        html[data-mode="dark"] .artalk-netdisk-card[data-platform="baidu"] .netdisk-icon {
          background: linear-gradient(135deg, #4285f4, #66a3ff);
          border-color: #4285f4;
        }
        
        .artalk-netdisk-card[data-platform="aliyun"] .netdisk-icon {
          background: linear-gradient(135deg, #ff6a00, #ff8533);
          border-color: #ff6a00;
        }
        
        .artalk-netdisk-card[data-platform="onedrive"] .netdisk-icon {
          background: linear-gradient(135deg, #0078d4, #40a6ff);
          border-color: #0078d4;
        }
        
        .artalk-netdisk-card[data-platform="googledrive"] .netdisk-icon {
          background: linear-gradient(135deg, #4285f4, #34a853, #fbbc05, #ea4335);
          border-color: #4285f4;
        }

        /* 复制成功动画 */
        .copy-btn.copied {
          background: #28a745 !important;
          color: white !important;
          transform: scale(1.1);
        }
        
        html[data-mode="dark"] .copy-btn.copied {
          background: #28a745 !important;
          color: white !important;
        }

        /* 响应式设计 */
        @media (max-width: 480px) {
          .netdisk-container {
            padding: 12px !important;
          }
          
          .netdisk-header {
            gap: 10px !important;
            margin-bottom: 10px !important;
          }
          
          .netdisk-icon {
            width: 36px !important;
            height: 36px !important;
          }
          
          .platform-emoji {
            font-size: 16px !important;
          }
          
          .netdisk-title {
            font-size: 14px !important;
          }
          
          .netdisk-platform {
            font-size: 11px !important;
          }
          
          .netdisk-actions {
            gap: 2px !important;
          }
          
          .copy-btn,
          .open-btn {
            padding: 6px !important;
          }
        }
      `;
      document.head.appendChild(style);
    };

    const copyToClipboard = async (text, button) => {
      try {
        await navigator.clipboard.writeText(text);
        
        // 添加复制成功动画
        button.classList.add('copied');
        
        // 显示提示
        const originalTitle = button.title;
        button.title = '复制成功！';
        
        setTimeout(() => {
          button.classList.remove('copied');
          button.title = originalTitle;
        }, 1500);
        
        return true;
      } catch (err) {
        console.error('复制失败:', err);
        
        // 降级方案：使用 execCommand
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          
          button.classList.add('copied');
          const originalTitle = button.title;
          button.title = '复制成功！';
          
          setTimeout(() => {
            button.classList.remove('copied');
            button.title = originalTitle;
          }, 1500);
          
          return true;
        } catch (fallbackErr) {
          console.error('降级复制方案也失败:', fallbackErr);
          return false;
        }
      }
    };

    const handleCardClick = (cardElement, e) => {
      // 如果点击的是按钮，不处理卡片点击
      if (e.target.closest('.copy-btn, .open-btn')) {
        return;
      }
      
      const url = cardElement.dataset.url;
      if (url) {
        window.open(url, '_blank');
      }
    };

    const initNetdiskCard = (cardElement) => {
      if (cardElement.dataset.inited) return;

      const url = cardElement.dataset.url;
      
      // 复制URL按钮
      const copyUrlBtn = cardElement.querySelector('.copy-btn[data-copy="url"]');
      if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          copyToClipboard(url, copyUrlBtn);
        });
      }

      // 复制提取码按钮
      const copyPasswordBtn = cardElement.querySelector('.copy-btn[data-copy="password"]');
      if (copyPasswordBtn) {
        const passwordCode = cardElement.querySelector('.password-code');
        if (passwordCode) {
          copyPasswordBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(passwordCode.textContent, copyPasswordBtn);
          });
        }
      }

      // 打开链接按钮
      const openBtn = cardElement.querySelector('.open-btn');
      if (openBtn) {
        openBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(url, '_blank');
        });
      }

      // 整个卡片点击事件
      cardElement.addEventListener('click', (e) => {
        handleCardClick(cardElement, e);
      });

      cardElement.dataset.inited = 'true';
    };

    // 处理网盘链接语法的核心函数
    const processNetdiskSyntax = () => {
      // 确保 jQuery 可用
      if (typeof $ === 'undefined') {
        console.error('[artalk-plugin-netdisk] jQuery is required');
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

          // 查找并替换网盘链接语法
          html = html.replace(NETDISK_REGEX, (match, platform, url, password, title, description) => {
            hasReplacement = true;
            platform = platform.trim();
            url = url.trim();
            password = password.trim();
            title = title.trim();
            description = description.trim();

            console.log('[artalk-plugin-netdisk] 发现网盘链接语法:', { 
              platform, url, password, title, description 
            });

            return createNetdiskCard(platform, url, password, title, description);
          });

          // 如果有替换，更新 DOM
          if (hasReplacement) {
            $p.html(html);
          }
        });
      });

      // 初始化所有新创建的网盘卡片
      $('.artalk-netdisk-card:not([data-inited])').each(function() {
        initNetdiskCard(this);
      });
    };

    // 初始化插件
    const init = () => {
      addStyles();
      
      // 监听评论列表加载事件
      artalk.on('list-loaded', () => {
        setTimeout(processNetdiskSyntax, 100); // 稍微延迟确保 DOM 完全渲染
      });

      // 监听评论更新事件（如果有的话）
      artalk.on('comment-rendered', () => {
        setTimeout(processNetdiskSyntax, 100);
      });

      // 初始处理已存在的内容
      setTimeout(processNetdiskSyntax, 500);
      
      console.log('[artalk-plugin-netdisk] 插件已加载 - 支持多种网盘平台 (支持黑夜模式)');
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
    window.ArtalkPlugins.ArtalkNetdiskPlugin = ArtalkNetdiskPlugin;
    
    if (window.Artalk) {
      window.Artalk.use(ArtalkNetdiskPlugin);
    }
  }

  exports.ArtalkNetdiskPlugin = ArtalkNetdiskPlugin;
  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
});
