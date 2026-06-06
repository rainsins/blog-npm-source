// Artalk 谷歌广告插件 (兼容 Artalk V3) - jQuery DOM 处理版 - 支持黑夜模式
(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    // Browser globals
    root = typeof globalThis !== 'undefined' ? globalThis : root || self;
    factory(root['artalk-plugin-ads'] = root['artalk-plugin-ads'] || {});
  }
})(this, function(exports) {
  'use strict';

  const ArtalkAdsPlugin = (artalk) => {
    // 广告语法正则表达式: [ad: 广告位ID : 标题]
    const AD_REGEX = /\[ad:\s*([^:\]]+)\s*:\s*([^\]]*)\]/g;

    // 默认配置
    const defaultConfig = {
      client: 'ca-pub-1737547058412175',
      scriptLoaded: false,
      adSlots: {
        'default': '1621475257',
        'article': '1621475257',
        'sidebar': '1621475257'
      }
    };

    // 加载谷歌广告脚本
    const loadAdScript = () => {
      if (defaultConfig.scriptLoaded) return Promise.resolve();
      
      return new Promise((resolve, reject) => {
        // 检查脚本是否已存在
        if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
          defaultConfig.scriptLoaded = true;
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${defaultConfig.client}`;
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
          defaultConfig.scriptLoaded = true;
          console.log('[artalk-plugin-ads] 谷歌广告脚本加载成功');
          resolve();
        };
        
        script.onerror = () => {
          console.error('[artalk-plugin-ads] 谷歌广告脚本加载失败');
          reject(new Error('广告脚本加载失败'));
        };
        
        document.head.appendChild(script);
      });
    };

    const createAdContainer = (slotId, title = '') => {
      // 获取广告位配置
      const adSlot = defaultConfig.adSlots[slotId] || defaultConfig.adSlots['default'];
      
      if (!title || title.trim() === '') {
        title = '赞助内容';
      }

      const adId = 'artalk-ad-' + Math.random().toString(36).substr(2, 9);
      
      return `
        <div class="artalk-ad-container" data-slot="${slotId}">
          <div class="ad-label">${title}</div>
          <div class="ad-content">
            <ins class="adsbygoogle artalk-ad-unit"
                 id="${adId}"
                 style="display:block; text-align:center;"
                 data-ad-layout="in-article"
                 data-ad-format="fluid"
                 data-ad-client="${defaultConfig.client}"
                 data-ad-slot="${adSlot}"></ins>
          </div>
        </div>
      `;
    };

    const addStyles = () => {
      const styleId = 'artalk-ads-plugin-styles';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* 白天模式样式 */
        html[data-mode="light"] .artalk-ad-container,
        .artalk-ad-container {
          margin: 16px 0;
          padding: 12px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          transition: all 0.2s ease;
          position: relative;
        }
        
        html[data-mode="light"] .artalk-ad-container:hover,
        .artalk-ad-container:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        html[data-mode="light"] .ad-label,
        .ad-label {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 8px;
          text-align: center;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        
        html[data-mode="light"] .ad-content,
        .ad-content {
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border-radius: 4px;
          border: 1px solid #dee2e6;
        }
        
        html[data-mode="light"] .artalk-ad-loading,
        .artalk-ad-loading {
          color: #6c757d;
          font-size: 14px;
          text-align: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        
        html[data-mode="light"] .artalk-ad-error,
        .artalk-ad-error {
          color: #dc3545;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          padding: 12px;
          border-radius: 4px;
          font-size: 14px;
          text-align: center;
        }

        /* 黑夜模式样式 */
        html[data-mode="dark"] .artalk-ad-container {
          margin: 16px 0;
          padding: 12px;
          background: #2d3748;
          border: 1px solid #4a5568;
          border-radius: 8px;
          transition: all 0.2s ease;
          position: relative;
        }
        
        html[data-mode="dark"] .artalk-ad-container:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        html[data-mode="dark"] .ad-label {
          font-size: 12px;
          color: #a0aec0;
          margin-bottom: 8px;
          text-align: center;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        
        html[data-mode="dark"] .ad-content {
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a202c;
          border-radius: 4px;
          border: 1px solid #4a5568;
        }
        
        html[data-mode="dark"] .artalk-ad-loading {
          color: #a0aec0;
          font-size: 14px;
          text-align: center;
          padding: 20px;
          background: #2d3748;
          border-radius: 4px;
        }
        
        html[data-mode="dark"] .artalk-ad-error {
          color: #fed7d7;
          background: #742a2a;
          border: 1px solid #9b2c2c;
          padding: 12px;
          border-radius: 4px;
          font-size: 14px;
          text-align: center;
        }

        /* 通用样式 */
        .artalk-ad-unit {
          width: 100%;
          max-width: 100%;
        }
        
        .ad-content:empty::before {
          content: "广告加载中...";
          color: #6c757d;
          font-size: 14px;
        }
        
        html[data-mode="dark"] .ad-content:empty::before {
          color: #a0aec0;
        }
        
        /* 响应式设计 */
        @media (max-width: 480px) {
          .artalk-ad-container {
            margin: 12px 0;
            padding: 10px;
          }
          
          .ad-label {
            font-size: 11px;
          }
          
          .ad-content {
            min-height: 80px;
          }
        }
        
        /* 隐藏广告阻止器提示 */
        .artalk-ad-container[data-ad-blocked="true"] {
          display: none;
        }
      `;
      document.head.appendChild(style);
    };

    const initializeAd = async (adContainer) => {
      if (adContainer.dataset.inited) return;
      
      try {
        // 确保广告脚本已加载
        await loadAdScript();
        
        const adUnit = adContainer.querySelector('.adsbygoogle');
        if (!adUnit) return;

        // 显示加载状态
        const adContent = adContainer.querySelector('.ad-content');
        adContent.classList.add('artalk-ad-loading');
        
        // 初始化广告
        if (window.adsbygoogle) {
          try {
            window.adsbygoogle.push({});
            adContainer.dataset.inited = 'true';
            
            // 检查广告是否被阻止
            setTimeout(() => {
              const adHeight = adUnit.offsetHeight;
              if (adHeight === 0) {
                adContainer.dataset.adBlocked = 'true';
                console.log('[artalk-plugin-ads] 广告可能被广告阻止器拦截');
              } else {
                adContent.classList.remove('artalk-ad-loading');
              }
            }, 2000);
            
          } catch (error) {
            console.error('[artalk-plugin-ads] 广告初始化失败:', error);
            showAdError(adContainer, '广告加载失败');
          }
        }
      } catch (error) {
        console.error('[artalk-plugin-ads] 广告脚本加载失败:', error);
        showAdError(adContainer, '广告服务不可用');
      }
    };

    const showAdError = (container, message) => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'artalk-ad-error';
      errorDiv.textContent = message;
      container.replaceWith(errorDiv);
    };

    // 处理广告语法的核心函数
    const processAdSyntax = () => {
      // 确保 jQuery 可用
      if (typeof $ === 'undefined') {
        console.error('[artalk-plugin-ads] jQuery is required');
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

          // 查找并替换广告语法
          html = html.replace(AD_REGEX, (match, slotId, title) => {
            hasReplacement = true;
            slotId = slotId.trim();
            title = title.trim();

            console.log('[artalk-plugin-ads] 发现广告语法:', { slotId, title });

            return createAdContainer(slotId, title);
          });

          // 如果有替换，更新 DOM
          if (hasReplacement) {
            $p.html(html);
          }
        });
      });

      // 初始化所有新创建的广告
      $('.artalk-ad-container:not([data-inited])').each(function() {
        initializeAd(this);
      });
    };

    // 初始化插件
    const init = () => {
      addStyles();
      
      // 监听评论列表加载事件
      artalk.on('list-loaded', () => {
        setTimeout(processAdSyntax, 100); // 稍微延迟确保 DOM 完全渲染
      });

      // 监听评论更新事件（如果有的话）
      artalk.on('comment-rendered', () => {
        setTimeout(processAdSyntax, 100);
      });

      // 初始处理已存在的内容
      setTimeout(processAdSyntax, 500);
      
      console.log('[artalk-plugin-ads] 插件已加载 - 谷歌广告支持 (支持黑夜模式)');
    };

    // 延迟初始化，确保 Artalk 完全加载
    if (artalk.getEl()) {
      init();
    } else {
      artalk.on('mounted', init);
    }

    // 公开配置方法
    return {
      setConfig: (config) => {
        Object.assign(defaultConfig, config);
      },
      getConfig: () => defaultConfig
    };
  };

  // 浏览器环境自动注册
  if (typeof window !== 'undefined') {
    if (!window.ArtalkPlugins) {
      window.ArtalkPlugins = {};
    }
    window.ArtalkPlugins.ArtalkAdsPlugin = ArtalkAdsPlugin;
    
    if (window.Artalk) {
      window.Artalk.use(ArtalkAdsPlugin);
    }
  }

  exports.ArtalkAdsPlugin = ArtalkAdsPlugin;
  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
});