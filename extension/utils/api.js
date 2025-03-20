/**
 * API 工具模組 - 處理與 Gemini API 的通信
 */

const ApiUtils = {
  // 發送請求到 Gemini API
  async sendToGemini(text, imageDataArray = [], apiKey, modelName, history = []) {
    try {
      // 檢查 API Key 是否存在
      if (!apiKey) {
        throw new Error('請先設定 API Key');
      }

      // 計算開始時間
      const startTime = performance.now();

      // 創建請求內容
      let contents = this._prepareContentsWithHistory(text, imageDataArray, history);

      // 構建 API 請求
      const requestBody = {
        contents: contents,
        generationConfig: {
          responseModalities: ['Text', 'Image']
        }
      };

      // API URL
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      // 發送請求
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // 檢查回應狀態
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API 請求失敗: ${errorData.error?.message || response.statusText}`);
      }

      // 解析回應
      const responseData = await response.json();

      // 計算處理時間
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(1);

      // 處理回應內容
      const result = {
        parts: [],
        text: '',
        images: [],
        processingTime: processingTime
      };

      // 提取文字和圖片，保留順序
      if (responseData.candidates && responseData.candidates.length > 0) {
        const candidate = responseData.candidates[0];
        if (candidate.content && candidate.content.parts) {
          candidate.content.parts.forEach(part => {
            if (part.text) {
              // 添加文字部分
              result.parts.push({
                type: 'text',
                content: part.text
              });
              // 同時保留舊的屬性
              result.text += part.text;
            } else if (part.inlineData) {
              const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              // 添加圖片部分
              result.parts.push({
                type: 'image',
                content: imageUrl
              });
              // 同時保留舊的屬性
              result.images.push(imageUrl);
            }
          });
        }
      }

      return result;
    } catch (error) {
      console.error('API 請求錯誤:', error);
      throw error;
    }
  },

  // 準備包含歷史記錄的請求內容
  _prepareContentsWithHistory(text, imageDataArray, history) {
    let contents = [];
    
    // 添加歷史對話內容
    if (history && history.length > 0) {
      for (const message of history) {
        const role = message.role === 'user' ? 'user' : 'model';
        const parts = [];
        
        // 添加文字內容
        if (message.content.text) {
          parts.push({ text: message.content.text });
        }
        
        // 添加圖片內容
        if (message.content.images && message.content.images.length > 0) {
          for (const imageUrl of message.content.images) {
            // 從 data:image/jpeg;base64,XXX 格式中提取資料部分
            if (imageUrl.startsWith('data:')) {
              const matches = imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
              if (matches && matches.length === 3) {
                parts.push({
                  inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                  }
                });
              }
            }
          }
        }
        
        // 添加到內容陣列
        if (parts.length > 0) {
          contents.push({
            role: role,
            parts: parts
          });
        }
      }
    }
    
    // 添加當前用戶的輸入
    const currentParts = [];
    
    // 添加文字部分
    if (text) {
      currentParts.push({ text: text });
    }
    
    // 添加圖片部分(如果存在)
    if (imageDataArray && imageDataArray.length > 0) {
      for (const imageData of imageDataArray) {
        // 從 data:image/jpeg;base64,XXX 格式中提取資料部分
        if (imageData.startsWith('data:')) {
          const matches = imageData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            currentParts.push({
              inlineData: {
                mimeType: matches[1],
                data: matches[2]
              }
            });
          }
        }
      }
    }
    
    // 添加當前用戶輸入到內容陣列
    if (currentParts.length > 0) {
      contents.push({
        role: 'user',
        parts: currentParts
      });
    }
    
    return contents;
  },

  // 獲取 Base64 圖片的 MIME 類型
  _getImageMimeType(base64Data) {
    // 默認 MIME 類型
    let mimeType = 'image/jpeg';

    // 嘗試從 base64 數據中提取 MIME 類型
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
      if (matches && matches.length > 1) {
        mimeType = matches[1];
      }
    }

    return mimeType;
  }
};

// 導出工具模組
window.ApiUtils = ApiUtils; 