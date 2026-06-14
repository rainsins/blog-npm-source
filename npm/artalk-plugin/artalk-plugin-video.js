// Artalk 视频播放器插件 - 支持 Plyr + DASH + HLS (修复多个初始化框版本)
(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    // Browser globals
    root = typeof globalThis !== 'undefined' ? globalThis : root || self;
    factory(root['artalk-plugin-video'] = root['artalk-plugin-video'] || {});
  }
})(this, function(exports) {
  'use strict';

  const ArtalkVideoPlugin = (artalk) => {
    // 视频语法正则表达式
    const VIDEO_REGEX = /\[video:\s*([^:\]]+)\s*:\s*([^:\]]*)\s*:\s*([^\]]*)\]/g;
    const VIDEO_DASH_REGEX = /\[video-dash:\s*([^:\]]+)\s*:\s*([^:\]]*)\s*:\s*([^\]]*)\]/g;
    const VIDEO_HLS_REGEX = /\[video-hls:\s*([^:\]]+)\s*:\s*([^:\]]*)\s*:\s*([^\]]*)\]/g;

    let plyrLoaded = false;
    let dashLoaded = false;
    let hlsLoaded = false;
    let playerInstances = [];

    // 添加初始化状态追踪
    const initializingPlayers = new Set(); // 正在初始化的播放器ID
    const initializationPromises = new Map(); // 存储初始化Promise

    // 支持的视频格式
    const supportedVideoFormats = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v'];

    const isSupportedVideoFormat = (src) => {
      return supportedVideoFormats.some(format => src.toLowerCase().includes(format));
    };

    // 检查库是否可用
    const checkLibraryAvailable = (libName, globalVar) => {
      try {
        return typeof window[globalVar] !== 'undefined';
      } catch (e) {
        console.warn(`[artalk-plugin-video] 检查 ${libName} 可用性时出错:`, e);
        return false;
      }
    };

    // 动态加载外部库 - 增强版本
    const loadScript = (src, globalVar = null, timeout = 10000) => {
      return new Promise((resolve, reject) => {
        // 检查是否已经加载
        if (document.querySelector(`script[src="${src}"]`)) {
          // 如果指定了全局变量，检查是否真的可用
          if (globalVar && checkLibraryAvailable(globalVar.split('.')[0], globalVar.split('.')[0])) {
            resolve();
            return;
          } else if (!globalVar) {
            resolve();
            return;
          }
        }

        const script = document.createElement('script');
        script.src = src;
        script.setAttribute('crossorigin', 'anonymous');

        let timeoutId;
        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          script.onload = null;
          script.onerror = null;
        };

        script.onload = () => {
          cleanup();
          console.log(`[artalk-plugin-video] 成功加载: ${src}`);

          // 给一点时间让库初始化
          setTimeout(() => {
            if (globalVar && !checkLibraryAvailable(globalVar.split('.')[0], globalVar.split('.')[0])) {
              reject(new Error(`${globalVar} 加载后不可用`));
            } else {
              resolve();
            }
          }, 100);
        };

        script.onerror = () => {
          cleanup();
          reject(new Error(`加载脚本失败: ${src}`));
        };

        // 设置超时
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`加载脚本超时: ${src}`));
        }, timeout);

        document.head.appendChild(script);
      });
    };

    const loadCSS = (href) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`link[href="${href}"]`)) {
          resolve();
          return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('crossorigin', 'anonymous');
        link.onload = resolve;
        link.onerror = () => reject(new Error(`加载样式失败: ${href}`));
        document.head.appendChild(link);
      });
    };

    // 2025年国内可用 CDN 备用列表
    const cdnFallbacks = {
      plyr: {
        css: [
          'https://cdn.jsdelivr.net/npm/plyr@3.8.4/dist/plyr.min.css',
        ],
        js: [
          'https://cdn.jsdelivr.net/npm/plyr@3.8.4/dist/plyr.polyfilled.min.js',
        ]
      },
      dash: [
        'https://cdn.jsdelivr.net/npm/dashjs@5.2.0/dist/legacy/umd/dash.all.min.js',
      ],
      hls: [
        'https://gcore.jsdelivr.net/npm/hls.js@1.6.16/dist/hls.min.js',
      ]
    };

    // 尝试多个 CDN 加载脚本
    const loadScriptWithFallback = async (urls, globalVar, libName) => {
      for (let i = 0; i < urls.length; i++) {
        try {
          await loadScript(urls[i], globalVar, 8000);
          console.log(`[artalk-plugin-video] ${libName} 从 CDN ${i + 1} 加载成功`);
          return true;
        } catch (error) {
          console.warn(`[artalk-plugin-video] ${libName} 从 CDN ${i + 1} 加载失败:`, error.message);
          if (i === urls.length - 1) {
            throw new Error(`所有 CDN 都无法加载 ${libName}`);
          }
        }
      }
      return false;
    };

    // 单例模式加载依赖库 - 确保只加载一次
    let dependenciesPromise = null;
    const loadDependencies = async () => {
      if (dependenciesPromise) {
        return await dependenciesPromise;
      }

      dependenciesPromise = (async () => {
        try {
          // 加载 Plyr
          if (!plyrLoaded) {
            console.log('[artalk-plugin-video] 开始加载 Plyr...');

            // 先加载 CSS
            let cssLoaded = false;
            for (const cssUrl of cdnFallbacks.plyr.css) {
              try {
                await loadCSS(cssUrl);
                cssLoaded = true;
                break;
              } catch (e) {
                console.warn(`[artalk-plugin-video] Plyr CSS 加载失败: ${cssUrl}`);
              }
            }

            if (!cssLoaded) {
              console.warn('[artalk-plugin-video] Plyr CSS 加载失败，将使用默认样式');
            }

            // 再加载 JS
            await loadScriptWithFallback(cdnFallbacks.plyr.js, 'Plyr', 'Plyr');
            plyrLoaded = true;
            console.log('[artalk-plugin-video] Plyr 加载完成');
          }

          // 加载 dash.js
          if (!dashLoaded) {
            console.log('[artalk-plugin-video] 开始加载 dash.js...');
            await loadScriptWithFallback(cdnFallbacks.dash, 'dashjs', 'dash.js');
            dashLoaded = true;
            console.log('[artalk-plugin-video] dash.js 加载完成');
          }

          // 加载 hls.js
          if (!hlsLoaded) {
            console.log('[artalk-plugin-video] 开始加载 hls.js...');
            await loadScriptWithFallback(cdnFallbacks.hls, 'Hls', 'hls.js');
            hlsLoaded = true;
            console.log('[artalk-plugin-video] hls.js 加载完成');
          }

          return true;
        } catch (error) {
          console.error('[artalk-plugin-video] 依赖库加载失败:', error);
          // 重置 Promise，允许重试
          dependenciesPromise = null;
          return false;
        }
      })();

      return await dependenciesPromise;
    };

    const createVideoPlayer = (src, poster = '', title = '', type = 'video') => {
      // 处理相对路径
      if (src.startsWith('//')) {
        src = 'https:' + src;
      }
      if (poster && poster.startsWith('//')) {
        poster = 'https:' + poster;
      }

      if (!title || title.trim() === '') {
        try {
          const urlParts = decodeURIComponent(src).split('/');
          title = urlParts[urlParts.length - 1].replace(/\.[^/.]+$/, "");
        } catch (e) {
          console.error("Error decoding or parsing URL:", e);
          title = "未知视频";
        }
      }

      const playerId = 'video-player-' + Math.random().toString(36).substr(2, 9);

      let videoElement = '';
      if (type === 'video') {
        videoElement = `<video class="plyr-video" ${poster ? `poster="${poster}"` : ''} playsinline controls crossorigin="anonymous"></video>`;
      } else if (type === 'dash') {
        videoElement = `<video class="plyr-video" ${poster ? `poster="${poster}"` : ''} playsinline controls crossorigin="anonymous"></video>`;
      } else if (type === 'hls') {
        videoElement = `<video class="plyr-video" ${poster ? `poster="${poster}"` : ''} playsinline controls crossorigin="anonymous"></video>`;
      }

      return `
        <div class="artalk-video-player" data-src="${src}" data-type="${type}" data-title="${title}" id="${playerId}">
          <div class="video-title" title="${title}">${title}</div>
          <div class="video-container">
            ${videoElement}
          </div>
        </div>
      `;
    };

    const addStyles = () => {
      const styleId = 'artalk-video-player-styles';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;

      const customPlyrStyles = `
        :root {
          --plyr-icon-url: https://npm.elemecdn.com/plyr@3.7.8/dist/plyr.svg;
        }
      `;

      style.textContent = customPlyrStyles + `
        /* 白天模式样式 */
        html[data-mode="light"] .artalk-video-player,
        .artalk-video-player {
          margin: 12px 0;
          padding: 16px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.2s ease;
          max-width: 100%;
        }

        html[data-mode="light"] .artalk-video-player:hover,
        .artalk-video-player:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        html[data-mode="light"] .video-title,
        .video-title {
          font-size: 14px;
          font-weight: 500;
          color: #495057;
          margin-bottom: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        html[data-mode="light"] .artalk-video-error,
        .artalk-video-error {
          color: #dc3545;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          margin: 8px 0;
        }

        /* 黑夜模式样式 */
        html[data-mode="dark"] .artalk-video-player {
          margin: 12px 0;
          padding: 16px;
          background: #2d3748;
          border: 1px solid #4a5568;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.2s ease;
          max-width: 100%;
        }

        html[data-mode="dark"] .artalk-video-player:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        html[data-mode="dark"] .video-title {
          font-size: 14px;
          font-weight: 500;
          color: #e2e8f0;
          margin-bottom: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        html[data-mode="dark"] .artalk-video-error {
          color: #fed7d7;
          background: #742a2a;
          border: 1px solid #9b2c2c;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          margin: 8px 0;
        }

        /* 视频容器样式 */
        .video-container {
          position: relative;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .video-container video {
          width: 100%;
          height: auto;
          border-radius: 6px;
        }

        /* Plyr 播放器自定义样式 */
        .artalk-video-player .plyr {
          border-radius: 6px;
          overflow: hidden;
        }

        .artalk-video-player .plyr--video {
          background: #000;
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
          .video-container {
            max-width: 100%;
          }

          .artalk-video-player {
            padding: 12px;
          }
        }

        @media (max-width: 480px) {
          .video-container {
            max-width: 100%;
          }

          .artalk-video-player {
            padding: 8px;
          }

          .video-title {
            font-size: 13px;
          }
        }

        /* 加载状态 */
        .video-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          background: #f5f5f5;
          border-radius: 6px;
          color: #666;
          font-size: 14px;
        }

        html[data-mode="dark"] .video-loading {
          background: #1a202c;
          color: #a0aec0;
        }

        /* 错误重试按钮 */
        .video-retry-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 8px;
          transition: background 0.2s;
        }

        .video-retry-btn:hover {
          background: #0056b3;
        }
      `;
      document.head.appendChild(style);
    };

    // 创建单个加载状态元素的工厂函数
    const createLoadingElement = () => {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'video-loading';
      loadingDiv.textContent = '正在加载播放器...';
      return loadingDiv;
    };

    // 修复后的初始化函数 - 防止重复初始化
    const initVideoPlayer = async (playerElement) => {
      const playerId = playerElement.id;

      // 检查是否已经初始化或正在初始化
      if (playerElement.dataset.inited === 'true') {
        console.log(`[artalk-plugin-video] 播放器 ${playerId} 已经初始化，跳过`);
        return;
      }

      if (initializingPlayers.has(playerId)) {
        console.log(`[artalk-plugin-video] 播放器 ${playerId} 正在初始化中，等待完成`);
        // 等待正在进行的初始化完成
        return await initializationPromises.get(playerId);
      }

      const src = playerElement.dataset.src;
      const type = playerElement.dataset.type;
      const title = playerElement.dataset.title;

      const videoElement = playerElement.querySelector('video');
      if (!videoElement) {
        console.error(`[artalk-plugin-video] 播放器 ${playerId} 找不到 video 元素`);
        return;
      }

      // 标记为正在初始化
      initializingPlayers.add(playerId);
      playerElement.dataset.initializing = 'true';

      // 创建初始化 Promise
      const initPromise = (async () => {
        try {
          // 清理可能存在的旧加载状态
          const existingLoading = playerElement.querySelector('.video-loading');
          if (existingLoading) {
            existingLoading.remove();
          }

          // 显示加载状态
          const loadingDiv = createLoadingElement();
          videoElement.parentNode.insertBefore(loadingDiv, videoElement);
          videoElement.style.display = 'none';

          // 确保依赖库已加载
          const dependenciesLoaded = await loadDependencies();
          if (!dependenciesLoaded) {
            throw new Error('依赖库加载失败');
          }

          // 检查必要的全局变量
          if (typeof window.Plyr === 'undefined') {
            throw new Error('Plyr 库未正确加载');
          }

          // 停止其他正在播放的视频
          playerInstances.forEach(player => {
            if (player && player.pause) {
              try {
                player.pause();
              } catch (e) {
                // 静默处理
              }
            }
          });

          let player;

          if (type === 'dash') {
            // 检查 dash.js 是否可用
            if (typeof window.dashjs === 'undefined') {
              throw new Error('dash.js 库未正确加载');
            }

            // DASH 流配置
            const dashPlayer = window.dashjs.MediaPlayer().create();

            dashPlayer.updateSettings({
              'debug': {
                'logLevel': window.dashjs.Debug.LOG_LEVEL_NONE
              },
              'streaming': {
                'buffer': {
                  'bufferToKeep': 30,
                  'bufferPruningInterval': 30
                }
              }
            });

            dashPlayer.on(window.dashjs.MediaPlayer.events.ERROR, (e) => {
              if (e.error && e.error.code && e.error.code.indexOf('CRITICAL') !== -1) {
                console.error('[artalk-plugin-video] DASH 严重错误:', e.error);
              }
            });

            dashPlayer.initialize(videoElement, src, false);

            player = new window.Plyr(videoElement, {
              controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
              settings: ['quality', 'speed'],
              quality: { default: 'auto', options: ['auto'] }
            });

            player.dash = dashPlayer;

          } else if (type === 'hls') {
            // HLS 流
            if (typeof window.Hls !== 'undefined' && window.Hls.isSupported()) {
              const hls = new window.Hls({
                enableWorker: true,
                lowLatencyMode: true
              });
              hls.loadSource(src);
              hls.attachMedia(videoElement);

              player = new window.Plyr(videoElement, {
                controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
                settings: ['quality', 'speed'],
                quality: { default: 'auto', options: ['auto'] }
              });

              player.hls = hls;

              hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                console.log('[artalk-plugin-video] HLS manifest loaded');
              });

              hls.on(window.Hls.Events.ERROR, (event, data) => {
                console.error('[artalk-plugin-video] HLS error:', data);
                if (data.fatal) {
                  switch (data.type) {
                    case window.Hls.ErrorTypes.NETWORK_ERROR:
                      hls.startLoad();
                      break;
                    case window.Hls.ErrorTypes.MEDIA_ERROR:
                      hls.recoverMediaError();
                      break;
                    default:
                      hls.destroy();
                      break;
                  }
                }
              });
            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
              // Safari 原生支持 HLS
              videoElement.src = src;
              player = new window.Plyr(videoElement, {
                controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen']
              });
            } else {
              throw new Error('HLS 不支持或 hls.js 未加载');
            }
          } else {
            // 普通视频
            videoElement.src = src;
            player = new window.Plyr(videoElement, {
              controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
              settings: ['speed'],
              speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] }
            });
          }

          // 监听播放事件，实现互斥播放
          player.on('play', () => {
            playerInstances.forEach(otherPlayer => {
              if (otherPlayer !== player && otherPlayer.pause) {
                try {
                  otherPlayer.pause();
                } catch (e) {
                  // 静默处理暂停错误
                }
              }
            });
          });

          playerInstances.push(player);

          // 移除加载状态，显示视频
          loadingDiv.remove();
          videoElement.style.display = 'block';

          // 标记初始化完成
          playerElement.dataset.inited = 'true';
          delete playerElement.dataset.initializing;

          console.log(`[artalk-plugin-video] ${type} 播放器初始化完成:`, title);

          return player;

        } catch (error) {
          console.error(`[artalk-plugin-video] 播放器 ${playerId} 初始化失败:`, error);

          // 清理加载状态
          const loadingDiv = playerElement.querySelector('.video-loading');
          if (loadingDiv) loadingDiv.remove();

          // 移除初始化标记
          delete playerElement.dataset.initializing;

          // 创建错误信息
          const existingError = playerElement.querySelector('.artalk-video-error');
          if (!existingError) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'artalk-video-error';
            errorMsg.innerHTML = `
              视频加载失败: ${error.message}
              <button class="video-retry-btn" onclick="this.parentElement.nextElementSibling.dataset.inited=''; this.parentElement.nextElementSibling.querySelector('video').style.display='none'; this.parentElement.remove(); window.ArtalkPlugins.ArtalkVideoPlugin.retryInit(this.parentElement.nextElementSibling);">重试</button>
            `;

            playerElement.parentNode.insertBefore(errorMsg, playerElement);
          }

          videoElement.style.display = 'none';
          throw error;
        } finally {
          // 清理初始化状态
          initializingPlayers.delete(playerId);
          initializationPromises.delete(playerId);
        }
      })();

      // 存储初始化 Promise
      initializationPromises.set(playerId, initPromise);

      return await initPromise;
    };

    // 暴露重试函数
    if (typeof window !== 'undefined') {
      if (!window.ArtalkPlugins) window.ArtalkPlugins = {};
      if (!window.ArtalkPlugins.ArtalkVideoPlugin) window.ArtalkPlugins.ArtalkVideoPlugin = {};
      window.ArtalkPlugins.ArtalkVideoPlugin.retryInit = initVideoPlayer;
    }

    // 处理视频语法的核心函数
    const processVideoSyntax = () => {
      // 确保 jQuery 可用
      if (typeof $ === 'undefined') {
        console.error('[artalk-plugin-video] jQuery is required');
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

          // 处理普通视频语法
          html = html.replace(VIDEO_REGEX, (match, src, poster, title) => {
            hasReplacement = true;
            src = src.trim();
            poster = poster.trim();
            title = title.trim();

            console.log('[artalk-plugin-video] 发现视频语法:', { src, poster, title });

            if (!isSupportedVideoFormat(src)) {
              return `<div class="artalk-video-error">不支持的视频格式: ${src}</div>`;
            }

            return createVideoPlayer(src, poster, title, 'video');
          });

          // 处理 DASH 视频语法
          html = html.replace(VIDEO_DASH_REGEX, (match, src, poster, title) => {
            hasReplacement = true;
            src = src.trim();
            poster = poster.trim();
            title = title.trim();

            console.log('[artalk-plugin-video] 发现 DASH 视频语法:', { src, poster, title });

            return createVideoPlayer(src, poster, title, 'dash');
          });

          // 处理 HLS 视频语法
          html = html.replace(VIDEO_HLS_REGEX, (match, src, poster, title) => {
            hasReplacement = true;
            src = src.trim();
            poster = poster.trim();
            title = title.trim();

            console.log('[artalk-plugin-video] 发现 HLS 视频语法:', { src, poster, title });

            return createVideoPlayer(src, poster, title, 'hls');
          });

          // 如果有替换，更新 DOM
          if (hasReplacement) {
            $p.html(html);
          }
        });
      });

      // 只初始化尚未初始化且不在初始化过程中的播放器
      $('.artalk-video-player').each(function() {
        const $player = $(this);
        const playerId = this.id;

        if (!this.dataset.inited && !this.dataset.initializing && !initializingPlayers.has(playerId)) {
          // 添加延迟，避免频繁初始化
          setTimeout(() => {
            initVideoPlayer(this);
          }, 100);
        }
      });
    };

    // 初始化插件
    const init = () => {
      addStyles();

      // 监听评论列表加载事件
      artalk.on('list-loaded', () => {
        // 延迟处理，确保 DOM 已更新
        setTimeout(processVideoSyntax, 200);
      });

      // 监听单条评论渲染事件
      artalk.on('comment-rendered', () => {
        setTimeout(processVideoSyntax, 100);
      });

      console.log('[artalk-plugin-video] 插件已加载 - 支持 Plyr + DASH + HLS (修复多个初始化框版本)');
    };

    // 延迟初始化，确保 Artalk 完全加载
    if (artalk.getEl()) {
      init();
    } else {
      artalk.on('mounted', init);
    }

    // 清理函数 - 简化版本，重点是静默处理
    const destroy = () => {
      // 清理所有初始化状态
      initializingPlayers.clear();
      initializationPromises.clear();

      playerInstances.forEach(player => {
        if (player) {
          try {
            // 先暂停播放
            if (typeof player.pause === 'function') {
              player.pause();
            }

            // 静默清理 dash.js 实例
            if (player.dash) {
              try {
                // 使用 reset 而不是 destroy，更温和
                if (typeof player.dash.reset === 'function') {
                  player.dash.reset();
                }
                player.dash = null;
              } catch (e) {
                // 静默处理，不输出错误
                player.dash = null;
              }
            }

            // 静默清理 hls.js 实例
            if (player.hls) {
              try {
                if (typeof player.hls.destroy === 'function') {
                  player.hls.destroy();
                }
                player.hls = null;
              } catch (e) {
                // 静默处理
                player.hls = null;
              }
            }

            // 清理 Plyr 实例
            if (typeof player.destroy === 'function') {
              try {
                player.destroy();
              } catch (e) {
                // 静默处理
              }
            }

          } catch (error) {
            // 完全静默，不影响用户体验
          }
        }
      });

      playerInstances = [];

      // 清理可能残留的加载状态
      document.querySelectorAll('.video-loading').forEach(loading => {
        try {
          loading.remove();
        } catch (e) {
          // 静默处理
        }
      });

      // 重置所有播放器的初始化状态
      document.querySelectorAll('.artalk-video-player').forEach(player => {
        delete player.dataset.inited;
        delete player.dataset.initializing;
      });
    };

    artalk.on('destroy', destroy);
  };

  // 浏览器环境自动注册
  if (typeof window !== 'undefined') {
    if (!window.ArtalkPlugins) {
      window.ArtalkPlugins = {};
    }
    window.ArtalkPlugins.ArtalkVideoPlugin = ArtalkVideoPlugin;

    if (window.Artalk) {
      window.Artalk.use(ArtalkVideoPlugin);
    }
  }

  exports.ArtalkVideoPlugin = ArtalkVideoPlugin;
  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
});
