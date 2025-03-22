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
    
    // 添加重送按鈕
    messageContent += `<button class="resend-btn" data-id="${message.id}" title="重新發送">&#8635;</button>`;
    
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
          
          // 確保在某些環境下也能捲動（如 Safari 可能不支持 scrollTo 選項）
          // 捲動位置容錯檢查
          if (Math.abs(container.scrollTop - (container.scrollHeight - container.clientHeight)) > 1) {
            // 如果捲動位置不符合期望，使用直接賦值方式捲動
            setTimeout(() => {
              try {
                container.scrollTop = container.scrollHeight;
              } catch (fallbackError) {
                console.error('備選捲動方法失敗:', fallbackError);
              }
            }, 100);
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
  }
};

// 導出工具模組
window.UiUtils = UiUtils; 