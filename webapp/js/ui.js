/**
 * UI 工具模組 - 處理介面操作和 DOM 渲染
 */

const UiUtils = {
  // 生成唯一 ID
  generateId: function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  // 創建使用者訊息 DOM 元素
  createUserMessageElement: function(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    messageElement.dataset.id = message.id;
    
    let messageContent = '';
    
    // 添加文字內容
    if (message.content.text) {
      messageContent += `<div class="message-text">${this.escapeHtml(message.content.text)}</div>`;
    }
    
    // 添加圖片內容
    if (message.content.images && message.content.images.length > 0) {
      messageContent += '<div class="message-images">';
      message.content.images.forEach(imageUrl => {
        messageContent += `<img src="${imageUrl}" class="message-image message-image-small" data-full-image="${imageUrl}">`;
      });
      messageContent += '</div>';
    }
    
    // 添加時間戳記
    messageContent += `<div class="message-time">${this.formatTimestamp(message.timestamp)}</div>`;
    
    // 添加刪除按鈕
    messageContent += `<button class="delete-btn" data-id="${message.id}">&times;</button>`;
    
    messageElement.innerHTML = messageContent;
    return messageElement;
  },
  
  // 創建助理訊息 DOM 元素
  createAssistantMessageElement: function(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message assistant-message';
    messageElement.dataset.id = message.id;
    
    let messageContent = '';
    
    // 按照內容部分順序渲染
    if (message.content.parts && message.content.parts.length > 0) {
      message.content.parts.forEach(part => {
        if (part.type === 'text') {
          messageContent += `<div class="message-text">${this.escapeHtml(part.content)}</div>`;
        } else if (part.type === 'image') {
          messageContent += `<div class="message-image-container">
            <img src="${part.content}" class="message-image message-image-small" data-full-image="${part.content}">
          </div>`;
        }
      });
    } else {
      // 向後兼容：舊的渲染方式
      // 添加文字內容
      if (message.content.text) {
        messageContent += `<div class="message-text">${this.escapeHtml(message.content.text)}</div>`;
      }
      
      // 添加圖片內容
      if (message.content.images && message.content.images.length > 0) {
        messageContent += '<div class="message-images">';
        message.content.images.forEach(imageUrl => {
          messageContent += `<img src="${imageUrl}" class="message-image message-image-small" data-full-image="${imageUrl}">`;
        });
        messageContent += '</div>';
      }
    }
    
    // 添加處理時間和時間戳記
    messageContent += `<div class="message-time">處理時間: ${message.processingTime}秒 | ${this.formatTimestamp(message.timestamp)}</div>`;
    
    // 添加刪除按鈕
    messageContent += `<button class="delete-btn" data-id="${message.id}">&times;</button>`;
    
    messageElement.innerHTML = messageContent;
    return messageElement;
  },
  
  // 格式化時間戳記為可讀格式
  formatTimestamp: function(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  },
  
  // 顯示錯誤訊息
  showError: function(message) {
    alert(message);
  },
  
  // 創建載入中指示器
  createLoadingIndicator: function() {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.id = 'loadingIndicator';
    return loadingElement;
  },
  
  // 移除載入中指示器
  removeLoadingIndicator: function() {
    const loadingElement = document.getElementById('loadingIndicator');
    if (loadingElement) {
      loadingElement.remove();
    }
  },
  
  // 轉義 HTML 字元，防止 XSS 攻擊
  escapeHtml: function(text) {
    if (!text) return '';
    
    const element = document.createElement('div');
    element.textContent = text;
    return element.innerHTML;
  },
  
  // 將圖片轉換為 Base64 格式
  fileToBase64: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
  
  // 調整圖片大小，用於避免超過 API 大小限制
  resizeImage: async function(base64Image, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // 計算縮放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // 創建 canvas 並繪製調整後的圖片
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // 將 canvas 轉換為 Base64
        const resizedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('圖片載入失敗'));
      };
      
      img.src = base64Image;
    });
  },
  
  // 滾動到容器底部
  scrollToBottom: function(container) {
    if (!container) {
      console.warn('嘗試捲動一個不存在的容器');
      return;
    }
    
    try {
      // 使用 requestAnimationFrame 確保在渲染循環中執行捲動
      requestAnimationFrame(() => {
        try {
          // 檢查容器是否仍然存在於DOM中
          if (!document.body.contains(container)) {
            console.warn('嘗試捲動一個不在DOM中的容器');
            return;
          }
          
          // 檢查容器是否有有效的捲動高度
          if (container.scrollHeight === 0) {
            console.warn('容器沒有有效的捲動高度');
            return;
          }
          
          // 使用平滑捲動效果
          try {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          } catch (scrollToError) {
            console.warn('使用 scrollTo 捲動失敗，嘗試使用 scrollTop:', scrollToError);
            // 備選方案：直接設置 scrollTop
            container.scrollTop = container.scrollHeight;
          }
        } catch (error) {
          console.error('在 requestAnimationFrame 中捲動容器時出錯:', error);
        }
      });
    } catch (error) {
      console.error('捲動容器時出錯:', error);
      // 最後的嘗試 - 直接設置 scrollTop
      try {
        container.scrollTop = container.scrollHeight;
      } catch (finalError) {
        console.error('最終捲動嘗試失敗:', finalError);
      }
    }
  },
  
  // 檢查是否應該捲動到底部
  shouldScrollToBottom: function(container, threshold = 100) {
    if (!container) return true;
    return (container.scrollHeight - container.scrollTop - container.clientHeight) < threshold;
  },
  
  // 初始化移動裝置的視口調整
  initMobileViewport: function() {
    // 獲取必要的DOM元素
    const chatContainer = document.getElementById('chatContainer');
    const inputContainer = document.querySelector('.input-container');
    const messageInput = document.getElementById('messageInput');
    const container = document.querySelector('.container');
    
    // 定義一個函數來根據可見視口調整輸入框位置
    const adjustInputPosition = () => {
      // 獲取可視窗口高度
      const viewportHeight = window.innerHeight;
      // 獲取輸入框容器的高度
      const inputContainerHeight = inputContainer.offsetHeight;
      // 計算聊天容器應有的高度
      const chatContainerHeight = viewportHeight - inputContainerHeight - 70; // 70是頂部和其他元素的高度預估
      
      // 設定聊天容器的高度
      chatContainer.style.height = `${chatContainerHeight}px`;
      chatContainer.style.maxHeight = `${chatContainerHeight}px`;
      
      // 將聊天內容滾動到底部
      this.scrollToBottom(chatContainer);
    };
    
    // 初始調整
    adjustInputPosition();
    
    // 窗口大小改變時調整
    window.addEventListener('resize', adjustInputPosition);
    
    // 處理 iOS 鍵盤事件
    if (messageInput) {
      // 當輸入框獲得焦點時，可能會出現虛擬鍵盤
      messageInput.addEventListener('focus', () => {
        // 延遲調整，等待鍵盤彈出
        setTimeout(() => {
          adjustInputPosition();
          // 確保輸入框在視圖中
          messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      });
      
      // 當輸入框失去焦點時
      messageInput.addEventListener('blur', () => {
        // 延遲調整，等待鍵盤收起
        setTimeout(adjustInputPosition, 300);
      });
      
      // 當輸入內容變化時，可能需要調整容器高度
      messageInput.addEventListener('input', adjustInputPosition);
    }
    
    // 阻止 iOS 雙擊縮放
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      const DOUBLE_TAP_THRESHOLD = 300;
      
      if (this.lastTap && (now - this.lastTap) < DOUBLE_TAP_THRESHOLD) {
        e.preventDefault();
      }
      
      this.lastTap = now;
    }, { passive: false });
    
    // 處理初始視口高度
    // 修正移動端100vh問題
    function setVH() {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setVH();
    window.addEventListener('resize', setVH);
  }
}; 