/**
 * 存儲工具模組 - 處理 API Key、模型名稱和對話歷史的本地儲存
 */

const StorageUtils = {
  // IndexedDB 數據庫名稱和版本
  DB_NAME: 'GeminiChatDB',
  DB_VERSION: 1,
  STORE_NAME: 'chatHistory',
  
  // 初始化 IndexedDB
  initIndexedDB: function() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.error('您的瀏覽器不支持 IndexedDB');
        reject(new Error('您的瀏覽器不支持 IndexedDB'));
        return;
      }
      
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = (event) => {
        console.error('打開數據庫失敗:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // 如果存儲對象不存在，創建一個新的
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          // 使用 'id' 作為鍵路徑
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },
  
  // 測試 IndexedDB 是否可用
  testIndexedDB: function() {
    return new Promise(resolve => {
      try {
        const request = indexedDB.open('test');
        request.onsuccess = () => {
          request.result.close();
          resolve(true);
        };
        request.onerror = () => {
          resolve(false);
        };
      } catch (error) {
        resolve(false);
      }
    });
  },
  
  // 儲存設定
  saveSettings: function(settings) {
    return new Promise((resolve) => {
      if (settings.apiKey) {
        localStorage.setItem('gemini_api_key', settings.apiKey);
      }
      if (settings.modelName) {
        localStorage.setItem('gemini_model_name', settings.modelName);
      }
      resolve();
    });
  },

  // 獲取設定
  getSettings: function() {
    return new Promise((resolve) => {
      const settings = {
        apiKey: localStorage.getItem('gemini_api_key') || '',
        modelName: localStorage.getItem('gemini_model_name') || 'gemini-2.0-flash-exp-image-generation'
      };
      resolve(settings);
    });
  },

  // 從 IndexedDB 儲存對話歷史
  saveHistory: async function(history) {
    try {
      // 首先清空舊的 localStorage 紀錄
      localStorage.removeItem('gemini_chat_history');
      
      const db = await this.initIndexedDB();
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // 清空現有的存儲
      const clearRequest = store.clear();
      
      return new Promise((resolve, reject) => {
        clearRequest.onsuccess = () => {
          // 添加所有訊息
          let addCounter = 0;
          let addSuccess = 0;
          
          if (history.length === 0) {
            resolve();
            return;
          }
          
          history.forEach((message) => {
            addCounter++;
            const addRequest = store.add(message);
            
            addRequest.onsuccess = () => {
              addSuccess++;
              if (addSuccess === history.length) {
                resolve();
              }
            };
            
            addRequest.onerror = (error) => {
              console.error('儲存訊息失敗:', error);
              // 繼續處理其他訊息
              addSuccess++;
              if (addSuccess === history.length) {
                resolve();
              }
            };
          });
        };
        
        clearRequest.onerror = (error) => {
          console.error('清空存儲失敗:', error);
          reject(error);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('保存對話歷史時出錯:', error);
      // 如果 IndexedDB 失敗，嘗試使用 localStorage 作為備選
      try {
        localStorage.setItem('gemini_chat_history', JSON.stringify(history));
      } catch (e) {
        console.error('保存到 localStorage 也失敗:', e);
      }
      return Promise.resolve();
    }
  },

  // 從 IndexedDB 獲取對話歷史
  getHistory: async function() {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const messages = request.result;
          // 按時間戳排序
          messages.sort((a, b) => a.timestamp - b.timestamp);
          db.close();
          resolve(messages);
        };
        
        request.onerror = (error) => {
          console.error('獲取對話歷史失敗:', error);
          db.close();
          reject(error);
        };
      });
    } catch (error) {
      console.error('獲取對話歷史時出錯:', error);
      // 如果 IndexedDB 失敗，嘗試從 localStorage 讀取
      try {
        const history = JSON.parse(localStorage.getItem('gemini_chat_history') || '[]');
        return history;
      } catch (parseError) {
        console.error('解析對話歷史時出錯:', parseError);
        return [];
      }
    }
  },

  // 添加一條對話記錄並儲存
  addMessageToHistory: async function(message) {
    try {
      const history = await this.getHistory();
      history.push(message);
      await this.saveHistory(history);
      return history;
    } catch (error) {
      console.error('添加對話記錄時出錯:', error);
      return [];
    }
  },

  // 從歷史記錄中刪除一條訊息
  deleteMessageFromHistory: async function(messageId) {
    try {
      const history = await this.getHistory();
      const updatedHistory = history.filter(message => message.id !== messageId);
      await this.saveHistory(updatedHistory);
      return updatedHistory;
    } catch (error) {
      console.error('刪除對話記錄時出錯:', error);
      return [];
    }
  },

  // 清空所有歷史記錄
  clearHistory: async function() {
    try {
      await this.saveHistory([]);
      return [];
    } catch (error) {
      console.error('清空對話歷史時出錯:', error);
      return [];
    }
  },
  
  // 從 localStorage 遷移數據到 IndexedDB
  migrateLocalStorageToIndexedDB: async function() {
    try {
      const historyStr = localStorage.getItem('gemini_chat_history');
      if (!historyStr) return; // 沒有數據需要遷移
      
      const history = JSON.parse(historyStr);
      if (Array.isArray(history) && history.length > 0) {
        await this.saveHistory(history);
        // 遷移成功後清除舊數據
        localStorage.removeItem('gemini_chat_history');
        console.log('歷史記錄已從 localStorage 遷移到 IndexedDB');
      }
    } catch (error) {
      console.error('遷移歷史記錄時出錯:', error);
    }
  }
}; 