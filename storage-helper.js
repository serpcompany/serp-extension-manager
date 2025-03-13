// Utility functions to abstract storage operations
// This will provide a localStorage-like API over chrome.storage

const StorageHelper = {
  get: function(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], function(result) {
        resolve(result[key]);
      });
    });
  },
  
  getMultiple: function(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, function(result) {
        resolve(result);
      });
    });
  },
  
  set: function(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({[key]: value}, function() {
        resolve();
      });
    });
  },
  
  remove: function(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, function() {
        resolve();
      });
    });
  },
  
  // For backward compatibility with localStorage syntax
  getItem: function(key) {
    return this.get(key);
  },
  
  setItem: function(key, value) {
    return this.set(key, value);
  },
  
  removeItem: function(key) {
    return this.remove(key);
  },
  
  // Special handler for GRP- prefixed items
  getGroupData: function(groupId) {
    return this.get(`GRP-${groupId}`);
  },
  
  setGroupData: function(groupId, data) {
    return this.set(`GRP-${groupId}`, data);
  }
};

// Export the helper
window.StorageHelper = StorageHelper;