chrome.action.onClicked.addListener(async (tab) => {
  // 開啟側邊欄
  await chrome.sidePanel.open({ tabId: tab.id });
  
  // 設置側邊欄的寬度
  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: 'sidebar/sidebar.html',
    enabled: true
  });
}); 