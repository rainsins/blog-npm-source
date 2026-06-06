// Artalk 操作按钮图标插件 (兼容 Artalk V3)
(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    // Browser globals
    root = typeof globalThis !== 'undefined' ? globalThis : root || self;
    factory(root['artalk-plugin-icons'] = root['artalk-plugin-icons'] || {});
  }
})(this, function(exports) {
  'use strict';

  const ArtalkWeChatStylePlugin = (artalk) => {
    
    // 添加图标样式
    const addIconStyles = () => {
      const styleId = 'artalk-icons-style';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* 操作按钮图标样式 */
        .atk-actions span i.atk-icon {
          margin-right: 4px;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        /* 删除按钮特殊颜色 */
        .atk-actions span:has(i.fa-trash),
        .atk-actions span[data-action="delete"] {
          color: var(--at-color-red, #ff5652) !important;
        }

        .atk-actions span:has(i.fa-trash):hover,
        .atk-actions span[data-action="delete"]:hover {
          background: rgba(255, 86, 82, 0.1) !important;
        }

        .artalk.atk-dark-mode .atk-actions span:has(i.fa-trash):hover,
        .artalk.atk-dark-mode .atk-actions span[data-action="delete"]:hover {
          background: rgba(255, 86, 82, 0.15) !important;
        }

        /* 已激活状态的按钮样式 */
        .atk-actions span.atk-voted i.atk-icon,
        .atk-actions span[class*="active"] i.atk-icon {
          color: var(--at-color-main, #0083ff);
        }
      `;
      
      document.head.appendChild(style);
    };

    // 图标映射配置
    const iconMap = {
      '赞同': 'fa-thumbs-up',
      '反对': 'fa-thumbs-down', 
      '回复': 'fa-reply',
      '折叠': 'fa-minus',
      '已审': 'fa-check',
      '置顶': 'fa-thumbtack',
      '编辑': 'fa-edit',
      '删除': 'fa-trash'
    };

    // 添加图标到按钮
    const addIconToButton = (button) => {
      // 避免重复处理
      if (button.querySelector('i.atk-icon')) return;
      
      const text = button.textContent.trim();
      let iconClass = '';
      
      // 匹配图标
      for (const [keyword, icon] of Object.entries(iconMap)) {
        if (text.includes(keyword)) {
          iconClass = icon;
          break;
        }
      }
      
      if (iconClass) {
        const icon = document.createElement('i');
        icon.className = `fa-light ${iconClass} atk-icon`;
        
        // 将图标插入到按钮开头
        button.insertBefore(icon, button.firstChild);
        
        // 为删除按钮添加特殊标记
        if (iconClass === 'fa-trash') {
          button.setAttribute('data-action', 'delete');
        }
      }
    };

    // 处理所有操作按钮
    const processActionButtons = () => {
      const buttons = document.querySelectorAll('.atk-actions span');
      buttons.forEach(button => {
        addIconToButton(button);
      });
    };

    // 监听按钮点击事件，处理动态更新
    const handleButtonClick = (e) => {
      const button = e.target.closest('.atk-actions span');
      if (!button) return;

      // 延迟处理，等待 Artalk 更新 DOM
      setTimeout(() => {
        // 重新为这个按钮添加图标
        addIconToButton(button);
        
        // 处理同一组按钮中的其他按钮
        const actions = button.closest('.atk-actions');
        if (actions) {
          actions.querySelectorAll('span').forEach(btn => {
            addIconToButton(btn);
          });
        }
      }, 100);
    };

    // 使用事件委托监听点击
    const addClickListener = () => {
      document.addEventListener('click', handleButtonClick, true);
    };

    // 监听 DOM 变化
    const observeChanges = () => {
      const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        
        mutations.forEach((mutation) => {
          // 检查是否有新添加的节点或文本变化
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldProcess = true;
          }
          if (mutation.type === 'characterData') {
            shouldProcess = true;
          }
          // 检查属性变化（如 class 变化）
          if (mutation.type === 'attributes') {
            const target = mutation.target;
            if (target.matches && target.matches('.atk-actions span')) {
              shouldProcess = true;
            }
          }
        });

        if (shouldProcess) {
          setTimeout(processActionButtons, 50);
        }
      });

      const artalkEl = artalk.getEl();
      if (artalkEl) {
        observer.observe(artalkEl, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['class']
        });
      }
    };

    // 初始化插件
    const init = () => {
      addIconStyles();
      processActionButtons();
      addClickListener();
      observeChanges();
      
      console.log('[artalk-plugin-icons] 操作按钮图标插件已加载');
    };

    // 监听 Artalk 事件
    artalk.on('list-loaded', () => {
      setTimeout(processActionButtons, 100);
    });

    artalk.on('comment-inserted', () => {
      setTimeout(processActionButtons, 100);
    });

    artalk.on('comment-updated', () => {
      setTimeout(processActionButtons, 100);
    });

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
    window.ArtalkPlugins.ArtalkWeChatStylePlugin = ArtalkWeChatStylePlugin;
    
    if (window.Artalk) {
      window.Artalk.use(ArtalkWeChatStylePlugin);
    }
  }

  exports.ArtalkWeChatStylePlugin = ArtalkWeChatStylePlugin;
  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
});