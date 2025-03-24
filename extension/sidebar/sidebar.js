/**
 * 側邊欄主要邏輯
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

// 初始化應用
async function init() {
  try {
    // 首先載入設定
    await loadSettings();
    
    // 測試 IndexedDB 是否可用
    const isIndexedDBAvailable = await StorageUtils.testIndexedDB();
    if (!isIndexedDBAvailable) {
      console.warn('IndexedDB 不可用，將使用 localStorage 作為備選');
    } else {
      // 檢查並遷移數據
      await migrateLocalStorageToIndexedDB();
    }
    
    // 載入對話歷史
    await loadChatHistory();
    
    // 設定事件監聽器
    setupEventListeners();
    
    // 設置 MutationObserver 監視聊天容器變化
    setupChatContainerObserver();
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
    
    // 如果是 DOMException，顯示更具體的錯誤信息
    if (error instanceof DOMException) {
      console.error('發生 DOM 異常:', error.name, error.message);
      UiUtils.showError(`載入對話歷史時發生 DOM 異常: ${error.name}`);
    } else {
      UiUtils.showError('載入對話歷史時發生錯誤');
    }
    
    // 重設為空歷史記錄
    currentChatHistory = [];
    renderChatHistory([]);
  }
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
    settingsModal.style.display = 'block';
  });
  
  // 清除按鈕點擊事件
  clearBtn.addEventListener('click', () => {
    clearConfirmModal.style.display = 'block';
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
  window.addEventListener('resize', () => {
    if (shouldScrollToBottom()) {
      UiUtils.scrollToBottom(chatContainer);
    }
  });
  
  // 監聽頁面可見性變化事件
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && shouldScrollToBottom()) {
      UiUtils.scrollToBottom(chatContainer);
    }
  });
  
  // 監聽訊息編輯事件
  document.addEventListener('message-edited', async (event) => {
    const { messageId, newText, originalText } = event.detail;
    
    // 如果文本未變更，不進行任何操作
    if (newText === originalText) {
      return;
    }
    
    await handleMessageEdit(messageId, newText);
  });
}

// 設置 MutationObserver 監視聊天容器變化
function setupChatContainerObserver() {
  const observer = new MutationObserver(mutations => {
    let shouldScroll = shouldScrollToBottom();
    
    // 當有新內容加入時，捲動到底部
    if (shouldScroll) {
      // 使用 requestAnimationFrame 確保在下一個渲染循環中執行捲動
      requestAnimationFrame(() => {
        UiUtils.scrollToBottom(chatContainer);
      });
    }
  });
  
  // 配置 observer 監視子節點變化和屬性變化
  observer.observe(chatContainer, { 
    childList: true, 
    subtree: true, 
    attributes: true,
    attributeFilter: ['src', 'style']
  });
}

// 判斷是否應該捲動到底部
function shouldScrollToBottom() {
  // 如果聊天容器沒有滾動條或已經捲到底部，則應該捲動
  const scrollPosition = chatContainer.scrollTop + chatContainer.clientHeight;
  // 添加小容錯範圍（10px）
  return scrollPosition >= chatContainer.scrollHeight - 10;
}

// 處理多圖上傳
async function handleImagesUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  try {
    // 處理多個文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 檢查檔案類型
      if (!file.type.startsWith('image/')) {
        console.warn(`跳過非圖片檔案: ${file.name}`);
        continue;
      }
      
      // 將圖片轉換為 Base64
      const imageBase64 = await UiUtils.fileToBase64(file);
      
      // 添加到上傳圖片陣列
      uploadedImages.push(imageBase64);
      
      // 創建並添加預覽元素
      addImagePreview(imageBase64, uploadedImages.length - 1);
    }
    
    // 顯示圖片預覽容器
    if (uploadedImages.length > 0) {
      imagesPreviewContainer.style.display = 'block';
    }
    
  } catch (error) {
    UiUtils.showError(`上傳圖片時出錯: ${error.message}`);
    console.error('上傳圖片時出錯:', error);
  }
  
  // 清空輸入欄位，使其可以重複選擇同一檔案
  imageInput.value = '';
}

// 添加圖片預覽元素
function addImagePreview(imageBase64, index) {
  // 創建預覽容器
  const previewItem = document.createElement('div');
  previewItem.className = 'image-preview-item';
  previewItem.dataset.index = index;
  
  // 創建圖片元素
  const previewImage = document.createElement('img');
  previewImage.src = imageBase64;
  previewImage.alt = `預覽圖片 ${index + 1}`;
  
  // 創建刪除按鈕
  const removeButton = document.createElement('button');
  removeButton.className = 'remove-image-btn';
  removeButton.innerHTML = '×';
  removeButton.dataset.index = index;
  
  // 組合元素
  previewItem.appendChild(previewImage);
  previewItem.appendChild(removeButton);
  
  // 添加到網格
  imagesGrid.appendChild(previewItem);
}

// 處理圖片預覽區域的點擊事件
function handleImagesGridClick(event) {
  // 處理刪除按鈕點擊
  if (event.target.classList.contains('remove-image-btn')) {
    const index = parseInt(event.target.dataset.index);
    removeUploadedImage(index);
  }
  
  // 處理圖片點擊預覽
  if (event.target.tagName === 'IMG') {
    const previewItem = event.target.parentElement;
    const index = parseInt(previewItem.dataset.index);
    
    // 在模態視窗中顯示大圖
    previewImage.src = uploadedImages[index];
    imagePreviewModal.style.display = 'block';
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
  
  // 處理訊息重送
  if (event.target.classList.contains('resend-btn')) {
    const messageId = event.target.dataset.id;
    if (messageId) {
      resendMessage(messageId);
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

// 移除特定索引的上傳圖片
function removeUploadedImage(index) {
  // 從陣列中移除
  uploadedImages.splice(index, 1);
  
  // 重新渲染所有預覽圖片
  refreshImagePreviews();
  
  // 如果沒有圖片了，隱藏預覽容器
  if (uploadedImages.length === 0) {
    imagesPreviewContainer.style.display = 'none';
  }
}

// 重新渲染所有預覽圖片
function refreshImagePreviews() {
  // 清空預覽網格
  imagesGrid.innerHTML = '';
  
  // 重新添加所有圖片
  uploadedImages.forEach((imageBase64, index) => {
    addImagePreview(imageBase64, index);
  });
}

// 清空所有上傳的圖片
function clearUploadedImages() {
  uploadedImages = [];
  imagesGrid.innerHTML = '';
  imagesPreviewContainer.style.display = 'none';
}

// 處理發送訊息
async function handleSendMessage() {
  if (isWaitingForResponse) return;
  
  const text = messageInput.value.trim();
  if (!text && uploadedImages.length === 0) return;
  
  try {
    // 獲取 API Key 和模型名稱
    const settings = await StorageUtils.getSettings();
    if (!settings.apiKey) {
      UiUtils.showError('請先設定 API Key');
      settingsModal.style.display = 'block';
      return;
    }
    
    // 創建使用者訊息
    const userMessage = {
      id: UiUtils.generateId(),
      role: 'user',
      timestamp: Date.now(),
      content: {
        text: text,
        images: [...uploadedImages] // 複製當前的上傳圖片陣列
      }
    };
    
    // 添加使用者訊息到歷史
    await StorageUtils.addMessageToHistory(userMessage);
    currentChatHistory.push(userMessage);
    
    // 渲染使用者訊息
    const userMessageElement = UiUtils.createUserMessageElement(userMessage);
    chatContainer.appendChild(userMessageElement);
    UiUtils.scrollToBottom(chatContainer);
    
    // 清空輸入框和圖片預覽
    messageInput.value = '';
    clearUploadedImages();
    
    // 顯示載入指示器
    isWaitingForResponse = true;
    chatContainer.appendChild(UiUtils.createLoadingIndicator());
    UiUtils.scrollToBottom(chatContainer);
    
    // 發送請求到 Gemini API，包含對話歷史
    const apiResponse = await ApiUtils.sendToGemini(
      text,
      uploadedImages, // 傳遞多張圖片
      settings.apiKey,
      settings.modelName,
      currentChatHistory
    );
    
    // 創建助理訊息
    const assistantMessage = {
      id: UiUtils.generateId(),
      role: 'assistant',
      timestamp: Date.now(),
      content: {
        text: apiResponse.text,
        images: apiResponse.images,
        parts: apiResponse.parts || [] // 添加 parts 屬性，保存按順序排列的內容
      },
      processingTime: apiResponse.processingTime
    };
    
    // 添加助理訊息到歷史
    await StorageUtils.addMessageToHistory(assistantMessage);
    currentChatHistory.push(assistantMessage);
    
    // 移除載入指示器
    UiUtils.removeLoadingIndicator();
    
    // 渲染助理訊息
    const assistantMessageElement = UiUtils.createAssistantMessageElement(assistantMessage);
    chatContainer.appendChild(assistantMessageElement);
    UiUtils.scrollToBottom(chatContainer);
    
  } catch (error) {
    UiUtils.removeLoadingIndicator();
    UiUtils.showError(`發送訊息時出錯: ${error.message}`);
    console.error('發送訊息時出錯:', error);
  } finally {
    isWaitingForResponse = false;
  }
}

// 儲存設定
async function saveSettings() {
  try {
    const apiKey = apiKeyInput.value.trim();
    const modelName = modelNameInput.value.trim() || 'gemini-2.0-flash-exp-image-generation';
    
    await StorageUtils.saveSettings({
      apiKey: apiKey,
      modelName: modelName
    });
    
    settingsModal.style.display = 'none';
  } catch (error) {
    UiUtils.showError(`儲存設定時出錯: ${error.message}`);
    console.error('儲存設定時出錯:', error);
  }
}

// 清除所有對話歷史
async function clearHistory() {
  try {
    // 清空歷史記錄
    await StorageUtils.clearHistory();
    
    // 清空全局歷史變數
    currentChatHistory = [];
    
    // 清空聊天容器
    chatContainer.innerHTML = '';
    
    // 關閉確認視窗
    clearConfirmModal.style.display = 'none';
  } catch (error) {
    UiUtils.showError(`清除歷史時出錯: ${error.message}`);
    console.error('清除歷史時出錯:', error);
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

// 重送訊息
async function resendMessage(messageId) {
  try {
    // 如果正在等待回應，不允許重送訊息
    if (isWaitingForResponse) {
      UiUtils.showError('請等待目前的回應完成');
      return;
    }
    
    // 找到訊息在歷史記錄中的索引
    const messageIndex = currentChatHistory.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      console.warn(`嘗試重送不存在的訊息ID: ${messageId}`);
      return;
    }
    
    // 確認這確實是使用者的訊息
    const message = currentChatHistory[messageIndex];
    if (message.role !== 'user') {
      console.warn('只能重送使用者的訊息');
      return;
    }
    
    // 設置等待狀態
    isWaitingForResponse = true;
    
    // 截取到該訊息（包含該訊息）的歷史紀錄
    currentChatHistory = currentChatHistory.slice(0, messageIndex + 1);
    
    // 更新存儲
    await StorageUtils.saveHistory(currentChatHistory);
    
    // 重新渲染對話歷史
    renderChatHistory(currentChatHistory);
    
    // 獲取設定
    const settings = await StorageUtils.getSettings();
    
    // 檢查 API Key
    if (!settings.apiKey) {
      UiUtils.showError('請先設定 API Key');
      isWaitingForResponse = false;
      return;
    }
    
    // 添加載入指示器
    const loadingIndicator = UiUtils.createLoadingIndicator();
    chatContainer.appendChild(loadingIndicator);
    
    try {
      // 僅發送最近10條消息作為上下文
      const recentHistory = currentChatHistory.slice(-10);
      
      // 發送請求到 Gemini API
      const response = await ApiUtils.sendToGemini(
        message.content.text, 
        message.content.images || [], 
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
      console.error('重送訊息時出錯:', error);
      
      // 移除載入指示器
      UiUtils.removeLoadingIndicator();
      
      // 顯示錯誤訊息
      UiUtils.showError(`重送訊息時發生錯誤: ${error.message}`);
    }
    
    // 重設等待狀態
    isWaitingForResponse = false;
    
  } catch (error) {
    console.error('處理重送訊息時出錯:', error);
    UiUtils.showError('處理重送訊息時發生錯誤');
    isWaitingForResponse = false;
  }
}

// 將 localStorage 的對話歷史遷移到 IndexedDB (如果需要)
async function migrateLocalStorageToIndexedDB() {
  try {
    // 檢查 localStorage 中是否有對話歷史
    const localHistoryStr = localStorage.getItem('gemini_chat_history');
    if (!localHistoryStr) return;
    
    // 解析 localStorage 中的歷史記錄
    const localHistory = JSON.parse(localHistoryStr);
    if (!Array.isArray(localHistory) || localHistory.length === 0) return;
    
    console.log(`正在遷移 ${localHistory.length} 條對話記錄從 localStorage 到 IndexedDB...`);
    
    // 轉換舊格式的訊息
    const convertedHistory = localHistory.map(convertOldMessageFormat);
    
    // 儲存到 IndexedDB
    await StorageUtils.saveHistory(convertedHistory);
    
    // 遷移成功後，清除 localStorage 中的歷史記錄
    localStorage.removeItem('gemini_chat_history');
    
    console.log('遷移完成');
  } catch (error) {
    console.error('遷移對話歷史時出錯:', error);
    // 遷移失敗時不影響應用繼續運行
  }
}

// 轉換舊格式的訊息為新格式
function convertOldMessageFormat(message) {
  // 如果已經是新格式則直接返回
  if (message.content && message.content.parts) {
    return message;
  }
  
  // 複製訊息以避免修改原始對象
  const newMessage = { ...message };
  
  // 確保 content 存在
  if (!newMessage.content) {
    newMessage.content = { text: '', images: [] };
  }
  
  // 創建 parts 陣列
  newMessage.content.parts = [];
  
  // 添加文字部分
  if (newMessage.content.text) {
    newMessage.content.parts.push({
      type: 'text',
      content: newMessage.content.text
    });
  }
  
  // 添加圖片部分
  if (Array.isArray(newMessage.content.images)) {
    newMessage.content.images.forEach(imageUrl => {
      newMessage.content.parts.push({
        type: 'image',
        content: imageUrl
      });
    });
  }
  
  return newMessage;
}

// 處理訊息編輯
async function handleMessageEdit(messageId, newText) {
  try {
    // 如果正在等待回應，不允許編輯訊息
    if (isWaitingForResponse) {
      UiUtils.showError('請等待目前的回應完成');
      return;
    }
    
    // 設置等待狀態
    isWaitingForResponse = true;
    
    // 找到訊息在歷史記錄中的索引
    const messageIndex = currentChatHistory.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      console.warn(`嘗試編輯不存在的訊息ID: ${messageId}`);
      isWaitingForResponse = false;
      return;
    }
    
    // 確認這確實是使用者的訊息
    const message = currentChatHistory[messageIndex];
    if (message.role !== 'user') {
      console.warn('只能編輯使用者的訊息');
      isWaitingForResponse = false;
      return;
    }
    
    // 更新訊息文本
    const updatedMessage = {
      ...message,
      content: {
        ...message.content,
        text: newText
      }
    };
    
    // 截取到該訊息（包含該訊息）的歷史紀錄
    const updatedHistory = currentChatHistory.slice(0, messageIndex);
    // 添加更新後的訊息
    updatedHistory.push(updatedMessage);
    
    // 更新當前歷史紀錄
    currentChatHistory = updatedHistory;
    
    // 更新存儲
    await StorageUtils.saveHistory(currentChatHistory);
    
    // 重新渲染對話歷史
    renderChatHistory(currentChatHistory);
    
    // 獲取設定
    const settings = await StorageUtils.getSettings();
    
    // 檢查 API Key
    if (!settings.apiKey) {
      UiUtils.showError('請先設定 API Key');
      isWaitingForResponse = false;
      return;
    }
    
    // 添加載入指示器
    const loadingIndicator = UiUtils.createLoadingIndicator();
    chatContainer.appendChild(loadingIndicator);
    
    try {
      // 僅發送最近10條消息作為上下文
      const recentHistory = currentChatHistory.slice(-10);
      
      // 發送請求到 Gemini API
      const response = await ApiUtils.sendToGemini(
        newText, 
        updatedMessage.content.images || [], 
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
      console.error('編輯訊息後重新發送時出錯:', error);
      
      // 移除載入指示器
      UiUtils.removeLoadingIndicator();
      
      // 顯示錯誤訊息
      UiUtils.showError(`編輯訊息後重新發送時發生錯誤: ${error.message}`);
    }
    
    // 重設等待狀態
    isWaitingForResponse = false;
    
  } catch (error) {
    console.error('處理訊息編輯時出錯:', error);
    UiUtils.showError('處理訊息編輯時發生錯誤');
    isWaitingForResponse = false;
  }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', init); 