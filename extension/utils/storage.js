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
  
  // 儲存 API Key
  saveApiKey: function(apiKey) {
    return new Promise((resolve) => {
      localStorage.setItem('gemini_api_key', apiKey);
      resolve();
    });
  },

  // 獲取 API Key
  getApiKey: function() {
    return new Promise((resolve) => {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      resolve(apiKey);
    });
  },

  // 儲存模型名稱
  saveModelName: function(modelName) {
    return new Promise((resolve) => {
      localStorage.setItem('gemini_model_name', modelName);
      resolve();
    });
  },

  // 獲取模型名稱，如果沒有則使用預設值
  getModelName: function() {
    return new Promise((resolve) => {
      const modelName = localStorage.getItem('gemini_model_name') || 'gemini-2.0-flash-exp-image-generation';
      resolve(modelName);
    });
  },

  // 儲存所有設定
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

  // 獲取所有設定
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
          
          // 如果沒有訊息要添加
          if (history.length === 0) {
            resolve();
          }
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
      localStorage.setItem('gemini_chat_history', JSON.stringify(history));
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
      } catch (parsError) {
        console.error('解析對話歷史時出錯:', parsError);
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

  // 從 IndexedDB 刪除一條對話記錄
  deleteMessageFromHistory: async function(messageId) {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // 首先檢查訊息是否存在
      const getRequest = store.get(messageId);
      
      return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
          if (!getRequest.result) {
            console.warn(`嘗試刪除不存在的訊息ID: ${messageId}`);
            this.getHistory().then(resolve);
            return;
          }
          
          const deleteRequest = store.delete(messageId);
          
          deleteRequest.onsuccess = () => {
            this.getHistory().then(resolve);
          };
          
          deleteRequest.onerror = (error) => {
            console.error('刪除訊息失敗:', error);
            this.getHistory().then(resolve);
          };
        };
        
        getRequest.onerror = (error) => {
          console.error('檢查訊息失敗:', error);
          this.getHistory().then(resolve);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('刪除對話記錄時出錯:', error);
      // 發生錯誤時，重新獲取最新的歷史記錄
      return await this.getHistory();
    }
  },

  // 清空 IndexedDB 中的對話歷史
  clearHistory: async function() {
    try {
      // 首先清空 localStorage 中的歷史
      localStorage.removeItem('gemini_chat_history');
      
      const db = await this.initIndexedDB();
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          db.close();
          resolve([]);
        };
        
        request.onerror = (error) => {
          console.error('清空對話歷史失敗:', error);
          db.close();
          reject(error);
        };
      });
    } catch (error) {
      console.error('清空對話歷史時出錯:', error);
      return [];
    }
  },
  
  // 測試 IndexedDB 是否可用
  testIndexedDB: async function() {
    try {
      const db = await this.initIndexedDB();
      db.close();
      return true;
    } catch (error) {
      console.error('IndexedDB 測試失敗:', error);
      return false;
    }
  }
};

// 導出工具模組
window.StorageUtils = StorageUtils; 