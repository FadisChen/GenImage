# 畫伯阿Gem 網頁版

這是「畫伯阿Gem」Chrome 擴展的網頁版本，可以在任何設備上使用，無需安裝 Chrome 擴展。

## 功能特點

- 使用 Gemini API 生成和編輯圖片
- 支援文字輸入與圖片上傳
- 儲存對話歷史
- 響應式設計，支援手機和桌面設備
- 與 Chrome 擴展版本功能一致

## 使用指南

1. 打開網頁應用
2. 在設定中輸入您的 Gemini API Key
3. 輸入文字描述或上傳圖片
4. 點擊發送按鈕與 Gemini AI 進行互動

## API Key 獲取方式

要使用此應用，您需要一個 Google Gemini API Key，可以透過以下步驟獲取：

1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 登入您的 Google 帳號
3. 點擊右上角的「獲取 API Key」
4. 創建一個新的 API Key 或使用現有的
5. 將 API Key 複製到應用的設定頁面

## 注意事項

- 所有數據存儲在本地，不會上傳到任何伺服器
- 圖片會在上傳前自動調整大小，以符合 API 限制
- 支援多圖上傳和預覽

## 技術說明

應用使用純 HTML、CSS 和 JavaScript 構建，無需後端服務器，可以作為靜態網頁託管。數據存儲使用 IndexedDB 或 localStorage 作為備選方案。 