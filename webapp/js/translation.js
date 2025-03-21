/**
 * 翻譯工具模組 - 處理文字翻譯功能
 */

const TranslationUtils = {
  // 將文字翻譯為指定語言
  async translateText(text, targetLang = 'en') {
    if (!text || text.trim() === '') {
      return '';
    }
    
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`翻譯請求失敗: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 組合翻譯結果
      let translatedText = '';
      if (data && data[0]) {
        for (let i = 0; i < data[0].length; i++) {
          if (data[0][i][0]) {
            translatedText += data[0][i][0];
          }
        }
      }
      
      return translatedText;
    } catch (error) {
      console.error('翻譯文字時出錯:', error);
      // 翻譯失敗時返回原文
      return text;
    }
  }
}; 