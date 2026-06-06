// Artalk 音乐播放器插件 (兼容 Artalk V3) - jQuery DOM 处理版 - 支持黑夜模式
(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    // Browser globals
    root = typeof globalThis !== 'undefined' ? globalThis : root || self;
    factory(root['artalk-plugin-music'] = root['artalk-plugin-music'] || {});
  }
})(this, function(exports) {
  'use strict';

  const ArtalkMusicPlugin = (artalk) => {
    // 音乐语法正则表达式: [music: URL : 标题]
    const MUSIC_REGEX = /\[music:\s*([^:\]]+)\s*:\s*([^\]]*)\]/g;

    const supportedFormats = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus'];

    const isSupportedFormat = (src) => {
      return supportedFormats.some(format => src.toLowerCase().includes(format));
    };

    const createMusicPlayer = (src, title = '') => {
      // 处理相对路径，自动添加 https:
      if (src.startsWith('//')) {
        src = 'https:' + src;
      }

      if (!title || title.trim() === '') {
        try {
          const urlParts = decodeURIComponent(src).split('/');
          title = urlParts[urlParts.length - 1].replace(/\.[^/.]+$/, "");
        } catch (e) {
          console.error("Error decoding or parsing URL:", e);
          title = "未知曲目";
        }
      }

      const playerId = 'music-player-' + Math.random().toString(36).substr(2, 9);
      
      return `
        <div class="artalk-music-player" data-src="${src}">
          <div class="music-player-container">
            <div class="music-info">
              <div class="music-title" title="${title}">${title}</div>
              <div class="music-time">
                <span class="current-time">00:00</span>
                <span class="separator"> / </span>
                <span class="duration">00:00</span>
              </div>
            </div>
            <div class="music-controls">
              <button class="play-btn" aria-label="播放/暂停">
                <svg class="play-icon" viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M8 5v14l11-7z"/>
                </svg>
                <svg class="pause-icon" viewBox="0 0 24 24" width="16" height="16" style="display: none;">
                  <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              </button>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                  <div class="progress-handle"></div>
                </div>
              </div>
            </div>
            <audio class="atk-music-audio" src="${src}" preload="metadata" crossorigin="anonymous" style="display:none;"></audio>
          </div>
        </div>
      `;
    };

    const addStyles = () => {
      const styleId = 'artalk-music-player-styles';
      if (document.getElementById(styleId)) return;

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* 白天模式样式 */
        html[data-mode="light"] .artalk-music-player,
        .artalk-music-player {
          margin: 12px 0;
          padding: 16px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.2s ease;
        }
        
        html[data-mode="light"] .artalk-music-player:hover,
        .artalk-music-player:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        html[data-mode="light"] .music-title,
        .music-title {
          font-size: 14px;
          font-weight: 500;
          color: #495057;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        html[data-mode="light"] .music-time,
        .music-time {
          font-size: 12px;
          color: #6c757d;
        }
        
        html[data-mode="light"] .play-btn,
        .play-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #007bff;
          transition: all 0.2s ease;
        }
        
        html[data-mode="light"] .play-btn:hover,
        .play-btn:hover {
          background: rgba(0, 123, 255, 0.1);
        }
        
        html[data-mode="light"] .progress-bar,
        .progress-bar {
          position: relative;
          height: 4px;
          background: #e9ecef;
          border-radius: 2px;
          cursor: pointer;
          transition: height 0.2s ease;
        }
        
        html[data-mode="light"] .progress-fill,
        .progress-fill {
          height: 100%;
          background: #007bff;
          border-radius: 2px;
          width: 0%;
          transition: width 0.1s linear;
        }
        
        html[data-mode="light"] .progress-handle,
        .progress-handle {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #007bff;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.2s ease;
          left: 0%;
        }
        
        html[data-mode="light"] .artalk-music-error,
        .artalk-music-error {
          color: #dc3545;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          margin: 8px 0;
        }

        /* 黑夜模式样式 */
        html[data-mode="dark"] .artalk-music-player {
          margin: 12px 0;
          padding: 16px;
          background: #2d3748;
          border: 1px solid #4a5568;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.2s ease;
        }
        
        html[data-mode="dark"] .artalk-music-player:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        html[data-mode="dark"] .music-title {
          font-size: 14px;
          font-weight: 500;
          color: #e2e8f0;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        html[data-mode="dark"] .music-time {
          font-size: 12px;
          color: #a0aec0;
        }
        
        html[data-mode="dark"] .play-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #63b3ed;
          transition: all 0.2s ease;
        }
        
        html[data-mode="dark"] .play-btn:hover {
          background: rgba(99, 179, 237, 0.15);
        }
        
        html[data-mode="dark"] .progress-bar {
          position: relative;
          height: 4px;
          background: #4a5568;
          border-radius: 2px;
          cursor: pointer;
          transition: height 0.2s ease;
        }
        
        html[data-mode="dark"] .progress-fill {
          height: 100%;
          background: #63b3ed;
          border-radius: 2px;
          width: 0%;
          transition: width 0.1s linear;
        }
        
        html[data-mode="dark"] .progress-handle {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #63b3ed;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.2s ease;
          left: 0%;
        }
        
        html[data-mode="dark"] .artalk-music-error {
          color: #fed7d7;
          background: #742a2a;
          border: 1px solid #9b2c2c;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          margin: 8px 0;
        }

        /* 通用样式 */
        .music-player-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .music-info {
          flex: 1;
          min-width: 0;
        }
        
        .music-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        
        .progress-container {
          flex: 1;
          min-width: 100px;
          max-width: 200px;
        }
        
        .progress-bar:hover {
          height: 6px;
        }
        
        .progress-bar:hover .progress-handle {
          opacity: 1;
        }
        
        @media (max-width: 480px) {
          .music-player-container {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          
          .music-controls {
            justify-content: center;
          }
          
          .progress-container {
            max-width: none;
          }
        }
      `;
      document.head.appendChild(style);
    };

    const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds)) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const initAudioPlayer = (playerElement) => {
      const audio = playerElement.querySelector('.atk-music-audio');
      if (!audio || playerElement.dataset.inited) return;

      const playBtn = playerElement.querySelector('.play-btn');
      const playIcon = playerElement.querySelector('.play-icon');
      const pauseIcon = playerElement.querySelector('.pause-icon');
      const progressBar = playerElement.querySelector('.progress-bar');
      const progressFill = playerElement.querySelector('.progress-fill');
      const progressHandle = playerElement.querySelector('.progress-handle');
      const currentTimeEl = playerElement.querySelector('.current-time');
      const durationEl = playerElement.querySelector('.duration');
      
      let isDragging = false;

      const togglePlay = () => {
        if (audio.paused) {
          // 暂停其他正在播放的音频
          document.querySelectorAll('.atk-music-audio').forEach(otherAudio => {
            if (otherAudio !== audio && !otherAudio.paused) otherAudio.pause();
          });
          audio.play().catch(e => console.error('播放失败:', e));
        } else {
          audio.pause();
        }
      };
      
      playBtn.addEventListener('click', togglePlay);

      audio.addEventListener('play', () => {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      });

      audio.addEventListener('pause', () => {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      });

      audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        if (!isDragging && audio.duration) {
          const progress = (audio.currentTime / audio.duration) * 100;
          progressFill.style.width = `${progress}%`;
          progressHandle.style.left = `${progress}%`;
          currentTimeEl.textContent = formatTime(audio.currentTime);
        }
      });

      audio.addEventListener('ended', () => {
        progressFill.style.width = '0%';
        progressHandle.style.left = '0%';
        currentTimeEl.textContent = '00:00';
      });
      
      audio.addEventListener('error', (e) => {
        console.error('音频加载错误:', e);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'artalk-music-error';
        errorMsg.textContent = '音频加载失败，请检查链接是否有效';
        playerElement.replaceWith(errorMsg);
      });

      const updateProgress = (e) => {
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (audio.duration) {
          audio.currentTime = percent * audio.duration;
        }
      };
      
      const onMouseMove = (e) => isDragging && updateProgress(e);
      const onMouseUp = () => isDragging = false;

      progressBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateProgress(e);
      });

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      playerElement.dataset.inited = 'true';
    };

    // 处理音乐语法的核心函数
    const processMusicSyntax = () => {
      // 确保 jQuery 可用
      if (typeof $ === 'undefined') {
        console.error('[artalk-plugin-music] jQuery is required');
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

          // 查找并替换音乐语法
          html = html.replace(MUSIC_REGEX, (match, src, title) => {
            hasReplacement = true;
            src = src.trim();
            title = title.trim();

            console.log('[artalk-plugin-music] 发现音乐语法:', { src, title });

            if (!isSupportedFormat(src)) {
              return `<div class="artalk-music-error">不支持的音频格式: ${src}</div>`;
            }

            return createMusicPlayer(src, title);
          });

          // 如果有替换，更新 DOM
          if (hasReplacement) {
            $p.html(html);
          }
        });
      });

      // 初始化所有新创建的播放器
      $('.artalk-music-player:not([data-inited])').each(function() {
        initAudioPlayer(this);
      });
    };

    // 初始化插件
    const init = () => {
      addStyles();
      
      // 监听评论列表加载事件
      artalk.on('list-loaded', () => {
        setTimeout(processMusicSyntax, 100); // 稍微延迟确保 DOM 完全渲染
      });

      // 监听评论更新事件（如果有的话）
      artalk.on('comment-rendered', () => {
        setTimeout(processMusicSyntax, 100);
      });

      // 初始处理已存在的内容
      setTimeout(processMusicSyntax, 500);
      
      console.log('[artalk-plugin-music] 插件已加载 - DOM 处理模式 (支持黑夜模式)');
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
    window.ArtalkPlugins.ArtalkMusicPlugin = ArtalkMusicPlugin;
    
    if (window.Artalk) {
      window.Artalk.use(ArtalkMusicPlugin);
    }
  }

  exports.ArtalkMusicPlugin = ArtalkMusicPlugin;
  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
});