export const ExtensionStateManager = {
    // Core state management
    async setEnabled(enabled: boolean) {
      await chrome.storage.local.set({ 
        extensionEnabled: enabled,
        lastStateChange: new Date().toISOString()
      });
  
      // Broadcast state change to all contexts
      chrome.runtime.sendMessage({ 
        action: 'extensionStateChanged', 
        enabled,
        timestamp: new Date().toISOString()
      });
  
      if (!enabled) {
        await this.disableAllFunctionality();
      } else {
        await this.restoreFunctionality();
      }
    },
  
    async disableAllFunctionality() {
      try {
        // 1. Clear all active listeners and observers
        await this.clearContentScripts();
        
        // 2. Remove injected UI elements
        await this.removeInjectedElements();
        
        // 3. Clear stored temporary data
        await this.clearTemporaryData();
        
        // 4. Reset all feature flags
        await this.resetFeatureFlags();
        
        // 5. Remove active blocking rules
        await this.clearBlockingRules();
      } catch (error) {
        console.error('Error while disabling extension:', error);
      }
    },
  
    async clearContentScripts() {
      const tabs = await chrome.tabs.query({});
      const disablePromises = tabs.map(tab => {
        if (tab.id) {
          return chrome.tabs.sendMessage(tab.id, { 
            action: 'DISABLE_CONTENT_SCRIPTS',
            timestamp: new Date().toISOString()
          }).catch(() => {
            // Suppress errors for tabs where content script isn't loaded
          });
        }
      });
      await Promise.all(disablePromises);
    },
  
    async removeInjectedElements() {
      const tabs = await chrome.tabs.query({});
      const cleanupPromises = tabs.map(tab => {
        if (tab.id) {
          return chrome.tabs.sendMessage(tab.id, {
            action: 'REMOVE_INJECTED_ELEMENTS',
            elements: [
              '.hs-saver-warning',
              '.hs-saver-overlay',
              '.hs-saver-notification'
            ]
          }).catch(() => {
            // Suppress errors for tabs where content script isn't loaded
          });
        }
      });
      await Promise.all(cleanupPromises);
    },
  
    // async clearTemporaryData() {
    //   const keysToPreserve = ['userPreferences', 'authToken'];
    //   const storage = await chrome.storage.local.get(null);
    //   const keysToRemove = Object.keys(storage).filter(
    //     key => !keysToPreserve.includes(key)
    //   );
    //   await chrome.storage.local.remove(keysToRemove);
    // },
  
    async resetFeatureFlags() {
      await chrome.storage.local.set({
        'features': {
          automaticBlocking: false,
          hideMessages: false,
          autoReport: false,
          profileTag: false,
          notifications: false,
          aiDetection: false
        }
      });
    },
  
    async clearBlockingRules() {
      // Clear any active blocking rules
      await chrome.storage.local.remove([
        'blockingRules',
        'activeFilters',
        'temporaryBlocks'
      ]);
    },
  
    async restoreFunctionality() {
      // Reload extension state and reactivate features
      const userPrefs = await chrome.storage.local.get('userPreferences');
      if (userPrefs.userPreferences) {
        // Restore user's previous settings
        await this.reactivateFeatures(userPrefs.userPreferences);
      }
    },
  
    async reactivateFeatures(preferences: any) {
      // Reactivate features based on stored preferences
      await chrome.storage.local.set({
        features: {
          ...preferences,
          enabled: true
        }
      });
      
      // Notify tabs to reinitialize
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'REINITIALIZE_EXTENSION',
            preferences
          }).catch(() => {
            // Suppress errors for tabs where content script isn't loaded
          });
        }
      });
    },
  
    async isEnabled(): Promise<boolean> {
      const result = await chrome.storage.local.get('extensionEnabled');
      // Default to enabled if not set
      return result.extensionEnabled !== false;
    },
  
    // State change listener
    addStateListener(callback: (enabled: boolean) => void) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.extensionEnabled) {
          callback(changes.extensionEnabled.newValue);
        }
      });
    }
  };