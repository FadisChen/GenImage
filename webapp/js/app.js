/**
 * 應用主程式 - 整合所有功能並實現用戶界面互動
 */

// DOM 元素引用
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const uploadImageBtn = document.getElementById('uploadImageBtn');
const imageInput = document.getElementById('imageInput');
const settingsBtn = document.getElementById('settingsBtn');
const clearBtn = document.getElementById('clearBtn');
const settingsModal = document.getElementById('settingsModal');
const clearConfirmModal = document.getElementById('clearConfirmModal');
const imagePreviewModal = document.getElementById('imagePreviewModal');
const imagesPreviewContainer = document.getElementById('imagesPreviewContainer');
const imagesGrid = document.getElementById('imagesGrid');
const apiKeyInput = document.getElementById('apiKey');
const modelNameInput = document.getElementById('modelName');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const confirmClearBtn = document.getElementById('confirmClearBtn');
const cancelClearBtn = document.getElementById('cancelClearBtn');
const closeButtons = document.querySelectorAll('.close');
const previewImage = document.getElementById('previewImage');

// 狀態變數
let uploadedImages = []; // 使用陣列儲存多張圖片
let isWaitingForResponse = false;
let currentChatHistory = [];

// 等待 DOM 載入完成後初始化應用
document.addEventListener('DOMContentLoaded', init);

// 初始化應用
async function init() {
  try {
    // 初始化移動裝置的視口調整
    UiUtils.initMobileViewport();
    
    // 首先載入設定
    await loadSettings();
    
    // 測試 IndexedDB 是否可用
    const isIndexedDBAvailable = await StorageUtils.testIndexedDB();
    if (!isIndexedDBAvailable) {
      console.warn('IndexedDB 不可用，將使用 localStorage 作為備選');
    } else {
      // 檢查並遷移數據
      await StorageUtils.migrateLocalStorageToIndexedDB();
    }
    
    // 載入對話歷史
    await loadChatHistory();
    
    // 設定事件監聽器
    setupEventListeners();
    
    // 設置 MutationObserver 監視聊天容器變化
    setupChatContainerObserver();
    
    // 初始化輸入區域的位置
    adjustForMobileKeyboard();
  } catch (error) {
    console.error('初始化應用時出錯:', error);
    UiUtils.showError('初始化應用時發生錯誤');
  }
}

// 載入 API 設定
async function loadSettings() {
  try {
    const settings = await StorageUtils.getSettings();
    apiKeyInput.value = settings.apiKey;
    modelNameInput.value = settings.modelName;
  } catch (error) {
    console.error('載入設定時出錯:', error);
    UiUtils.showError('載入設定時發生錯誤');
  }
}

// 載入對話歷史
async function loadChatHistory() {
  try {
    // 顯示載入指示器
    const loadingIndicator = UiUtils.createLoadingIndicator();
    chatContainer.appendChild(loadingIndicator);
    
    // 獲取歷史記錄
    const history = await StorageUtils.getHistory();
    
    // 轉換舊格式的訊息
    const convertedHistory = Array.isArray(history) ? history.map(convertOldMessageFormat) : [];
    
    currentChatHistory = convertedHistory; // 保存到全局變數
    
    // 確保 history 是數組
    if (!Array.isArray(history)) {
      console.error('載入的歷史記錄不是有效數組');
      currentChatHistory = [];
      UiUtils.removeLoadingIndicator();
      renderChatHistory([]);
      return;
    }
    
    // 移除載入指示器
    UiUtils.removeLoadingIndicator();
    
    // 渲染歷史記錄
    renderChatHistory(convertedHistory);
    
  } catch (error) {
    console.error('載入對話歷史時出錯:', error);
    
    // 移除載入指示器
    UiUtils.removeLoadingIndicator();
    
    UiUtils.showError('載入對話歷史時發生錯誤');
    
    // 重設為空歷史記錄
    currentChatHistory = [];
    renderChatHistory([]);
  }
}

// 轉換舊格式的訊息
function convertOldMessageFormat(message) {
  // 如果已經是新格式，直接返回
  if (message.content && (message.content.parts || message.content.text || message.content.images)) {
    return message;
  }
  
  // 轉換舊格式
  const convertedMessage = {
    ...message,
    content: {
      text: message.text || '',
      images: message.images || []
    }
  };
  
  // 刪除舊屬性
  delete convertedMessage.text;
  delete convertedMessage.images;
  
  return convertedMessage;
}

// 渲染對話歷史
function renderChatHistory(history) {
  try {
    chatContainer.innerHTML = '';
    
    if (!Array.isArray(history) || history.length === 0) {
      return;
    }
    
    history.forEach(message => {
      try {
        let messageElement;
        
        if (message.role === 'user') {
          messageElement = UiUtils.createUserMessageElement(message);
        } else {
          messageElement = UiUtils.createAssistantMessageElement(message);
        }
        
        chatContainer.appendChild(messageElement);
      } catch (error) {
        console.error('渲染單條訊息時出錯:', error, message);
        // 繼續處理其他訊息
      }
    });
    
    // 使用 setTimeout 確保 DOM 更新後再捲動
    setTimeout(() => {
      try {
        UiUtils.scrollToBottom(chatContainer);
      } catch (error) {
        console.error('捲動到底部時出錯:', error);
      }
    }, 50);
    
  } catch (error) {
    console.error('渲染對話歷史時出錯:', error);
    chatContainer.innerHTML = '<div class="error-message">渲染對話歷史時發生錯誤</div>';
  }
}

// 設定事件監聽器
function setupEventListeners() {
  // 輸入框 Enter 鍵事件
  messageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  });
  
  // 上傳圖片按鈕點擊事件
  uploadImageBtn.addEventListener('click', () => {
    imageInput.click();
  });
  
  // 圖片選擇事件
  imageInput.addEventListener('change', handleImagesUpload);
  
  // 設定按鈕點擊事件
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });
  
  // 清除按鈕點擊事件
  clearBtn.addEventListener('click', () => {
    clearConfirmModal.style.display = 'flex';
  });
  
  // 儲存設定按鈕點擊事件
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // 確認清除按鈕點擊事件
  confirmClearBtn.addEventListener('click', clearHistory);
  
  // 取消清除按鈕點擊事件
  cancelClearBtn.addEventListener('click', () => {
    clearConfirmModal.style.display = 'none';
  });
  
  // 關閉按鈕點擊事件
  closeButtons.forEach(button => {
    button.addEventListener('click', function() {
      this.parentElement.parentElement.style.display = 'none';
    });
  });
  
  // 點擊視窗外關閉模態視窗
  window.addEventListener('click', event => {
    if (event.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
    if (event.target === imagePreviewModal) {
      imagePreviewModal.style.display = 'none';
    }
    if (event.target === clearConfirmModal) {
      clearConfirmModal.style.display = 'none';
    }
  });
  
  // 設置對話訊息的事件委派
  chatContainer.addEventListener('click', handleChatContainerClick);
  
  // 設置圖片預覽區域的事件委派
  imagesGrid.addEventListener('click', handleImagesGridClick);
  
  // 監聽視窗大小變化事件
  window.addEventListener('resize', adjustForMobileKeyboard);
  
  // 監聽視圖可見性變化事件
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // 當頁面再次可見時，調整佈局
      setTimeout(adjustForMobileKeyboard, 300);
    }
  });
  
  // 監聽方向變化事件
  window.addEventListener('orientationchange', () => {
    // 方向變化後延遲調整佈局
    setTimeout(adjustForMobileKeyboard, 500);
  });
}

// 設置 MutationObserver 監視聊天容器變化
function setupChatContainerObserver() {
  const observer = new MutationObserver(mutations => {
    let shouldScroll = UiUtils.shouldScrollToBottom(chatContainer);
    
    // 當有新內容加入時，捲動到底部
    if (shouldScroll) {
      // 使用 requestAnimationFrame 確保在下一個渲染循環中執行捲動
      requestAnimationFrame(() => {
        UiUtils.scrollToBottom(chatContainer);
      });
    }
  });
  
  observer.observe(chatContainer, { 
    childList: true, 
    subtree: true,
    characterData: true,
    attributes: true
  });
}

// 處理圖片上傳
async function handleImagesUpload(event) {
  try {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // 取消先前選擇的所有圖片
    // clearUploadedImages();
    
    // 添加新選擇的圖片
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 檢查文件是否為圖片
      if (!file.type.startsWith('image/')) {
        UiUtils.showError(`檔案 "${file.name}" 不是圖片格式`);
        continue;
      }
      
      // 檢查文件大小
      if (file.size > 5 * 1024 * 1024) { // 5MB 上限
        UiUtils.showError(`圖片 "${file.name}" 太大，請選擇小於 5MB 的圖片`);
        continue;
      }
      
      // 轉換圖片為 Base64
      const imageBase64 = await UiUtils.fileToBase64(file);
      
      // 調整圖片大小
      const resizedImage = await UiUtils.resizeImage(imageBase64);
      
      // 添加到已上傳圖片數組
      uploadedImages.push(resizedImage);
      
      // 添加圖片預覽
      addImagePreview(resizedImage, uploadedImages.length - 1);
    }
    
    // 顯示圖片預覽容器
    if (uploadedImages.length > 0) {
      imagesPreviewContainer.style.display = 'block';
    }
    
    // 清空文件輸入框的值，以便可以再次選擇相同的文件
    event.target.value = '';
    
  } catch (error) {
    console.error('處理圖片上傳時出錯:', error);
    UiUtils.showError('處理圖片上傳時發生錯誤');
  }
}

// 添加圖片預覽
function addImagePreview(imageBase64, index) {
  const previewItem = document.createElement('div');
  previewItem.className = 'image-preview-item';
  previewItem.innerHTML = `
    <img src="${imageBase64}" alt="預覽圖片" data-index="${index}">
    <button class="remove-image-btn" data-index="${index}">&times;</button>
  `;
  imagesGrid.appendChild(previewItem);
}

// 處理圖片預覽區域的點擊事件
function handleImagesGridClick(event) {
  const index = event.target.dataset.index;
  
  if (event.target.classList.contains('remove-image-btn') && index !== undefined) {
    // 點擊了刪除按鈕
    removeUploadedImage(parseInt(index));
  } else if (event.target.tagName === 'IMG' && index !== undefined) {
    // 點擊了圖片
    previewImage.src = uploadedImages[parseInt(index)];
    imagePreviewModal.style.display = 'flex';
  }
}

// 處理對話容器的點擊事件
function handleChatContainerClick(event) {
  // 處理訊息刪除
  if (event.target.classList.contains('delete-btn')) {
    const messageId = event.target.dataset.id;
    if (messageId) {
      deleteMessage(messageId);
    }
  }
  
  // 處理圖片預覽
  if (event.target.classList.contains('message-image')) {
    const fullImageUrl = event.target.dataset.fullImage;
    if (fullImageUrl) {
      previewImage.src = fullImageUrl;
      imagePreviewModal.style.display = 'flex';
    }
  }
}

// 移除已上傳的圖片
function removeUploadedImage(index) {
  // 從數組中移除圖片
  uploadedImages = uploadedImages.filter((_, i) => i !== index);
  
  // 重新整理預覽區域
  refreshImagePreviews();
  
  // 如果沒有圖片了，隱藏預覽容器
  if (uploadedImages.length === 0) {
    imagesPreviewContainer.style.display = 'none';
  }
}

// 重新整理圖片預覽
function refreshImagePreviews() {
  imagesGrid.innerHTML = '';
  uploadedImages.forEach((image, index) => {
    addImagePreview(image, index);
  });
}

// 清空已上傳的圖片
function clearUploadedImages() {
  uploadedImages = [];
  imagesGrid.innerHTML = '';
  imagesPreviewContainer.style.display = 'none';
}

// 處理發送訊息
async function handleSendMessage() {
  try {
    // 獲取輸入文字
    const text = messageInput.value.trim();
    
    // 檢查是否有輸入或上傳圖片
    if (text === '' && uploadedImages.length === 0) {
      return;
    }
    
    // 如果正在等待回應，不允許發送新訊息
    if (isWaitingForResponse) {
      return;
    }
    
    // 設置等待狀態
    isWaitingForResponse = true;
    
    // 獲取設定
    const settings = await StorageUtils.getSettings();
    
    // 檢查 API Key
    if (!settings.apiKey) {
      UiUtils.showError('請先設定 API Key');
      isWaitingForResponse = false;
      return;
    }
    
    // 創建使用者訊息對象
    const userMessage = {
      id: UiUtils.generateId(),
      role: 'user',
      content: {
        text: text,
        images: [...uploadedImages]
      },
      timestamp: Date.now()
    };
    
    // 將使用者訊息添加到聊天容器
    const userMessageElement = UiUtils.createUserMessageElement(userMessage);
    chatContainer.appendChild(userMessageElement);
    
    // 清空輸入框和上傳的圖片
    messageInput.value = '';
    clearUploadedImages();
    
    // 添加訊息到歷史記錄
    currentChatHistory.push(userMessage);
    await StorageUtils.saveHistory(currentChatHistory);
    
    // 捲動到底部
    UiUtils.scrollToBottom(chatContainer);
    
    // 添加載入指示器
    const loadingIndicator = UiUtils.createLoadingIndicator();
    chatContainer.appendChild(loadingIndicator);
    
    try {
      // 僅發送最近5條消息作為上下文
      const recentHistory = currentChatHistory.slice(-10);
      
      // 發送請求到 Gemini API
      const response = await ApiUtils.sendToGemini(
        text, 
        uploadedImages, 
        settings.apiKey, 
        settings.modelName,
        recentHistory
      );
      
      // 移除載入指示器
      UiUtils.removeLoadingIndicator();
      
      // 創建助理訊息對象
      const assistantMessage = {
        id: UiUtils.generateId(),
        role: 'assistant',
        content: {
          text: response.text,
          images: response.images,
          parts: response.parts
        },
        processingTime: response.processingTime,
        timestamp: Date.now()
      };
      
      // 將助理訊息添加到聊天容器
      const assistantMessageElement = UiUtils.createAssistantMessageElement(assistantMessage);
      chatContainer.appendChild(assistantMessageElement);
      
      // 捲動到底部
      UiUtils.scrollToBottom(chatContainer);
      
      // 添加訊息到歷史記錄
      currentChatHistory.push(assistantMessage);
      await StorageUtils.saveHistory(currentChatHistory);
      
    } catch (error) {
      console.error('發送訊息時出錯:', error);
      
      // 移除載入指示器
      UiUtils.removeLoadingIndicator();
      
      // 顯示錯誤訊息
      UiUtils.showError(`發送訊息時發生錯誤: ${error.message}`);
    }
    
    // 重設等待狀態
    isWaitingForResponse = false;
    
    // 發送後立即調整界面以適應鍵盤
    setTimeout(adjustForMobileKeyboard, 100);
    
  } catch (error) {
    console.error('處理發送訊息時出錯:', error);
    UiUtils.showError('處理發送訊息時發生錯誤');
    isWaitingForResponse = false;
  }
}

// 保存設定
async function saveSettings() {
  try {
    const apiKey = apiKeyInput.value.trim();
    const modelName = modelNameInput.value.trim() || 'gemini-2.0-flash-exp-image-generation';
    
    await StorageUtils.saveSettings({
      apiKey: apiKey,
      modelName: modelName
    });
    
    // 關閉設定模態視窗
    settingsModal.style.display = 'none';
    
  } catch (error) {
    console.error('保存設定時出錯:', error);
    UiUtils.showError('保存設定時發生錯誤');
  }
}

// 清空對話歷史
async function clearHistory() {
  try {
    // 清空歷史記錄
    currentChatHistory = [];
    await StorageUtils.clearHistory();
    
    // 清空聊天容器
    chatContainer.innerHTML = '';
    
    // 關閉確認模態視窗
    clearConfirmModal.style.display = 'none';
    
  } catch (error) {
    console.error('清空對話歷史時出錯:', error);
    UiUtils.showError('清空對話歷史時發生錯誤');
  }
}

// 從歷史記錄中刪除訊息
async function deleteMessage(messageId) {
  try {
    // 找到訊息在歷史記錄中的索引
    const index = currentChatHistory.findIndex(msg => msg.id === messageId);
    
    if (index === -1) {
      console.warn(`嘗試刪除不存在的訊息ID: ${messageId}`);
      return;
    }
    
    // 從歷史記錄中刪除訊息
    currentChatHistory.splice(index, 1);
    await StorageUtils.saveHistory(currentChatHistory);
    
    // 重新渲染對話歷史
    renderChatHistory(currentChatHistory);
    
  } catch (error) {
    console.error('刪除訊息時出錯:', error);
    UiUtils.showError('刪除訊息時發生錯誤');
  }
}

// 為手機鍵盤調整界面
function adjustForMobileKeyboard() {
  const chatContainer = document.getElementById('chatContainer');
  const inputContainer = document.querySelector('.input-container');
  
  if (!chatContainer || !inputContainer) return;
  
  // 獲取可視窗口高度
  const viewportHeight = window.innerHeight;
  // 獲取輸入框容器的高度
  const inputContainerHeight = inputContainer.offsetHeight;
  // 獲取頂部元素的高度
  const headerHeight = document.querySelector('.header').offsetHeight;
  // 計算聊天容器應有的高度
  const chatContainerHeight = viewportHeight - inputContainerHeight - headerHeight - 20; // 20是額外間距
  
  // 設定聊天容器的高度
  chatContainer.style.height = `${chatContainerHeight}px`;
  
  // 將聊天內容滾動到底部
  UiUtils.scrollToBottom(chatContainer);
} 