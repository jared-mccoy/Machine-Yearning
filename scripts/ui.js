/**
 * UI Controls and Theming
 * Handles theme toggling, animation controls, and other UI interactions
 */

// Initialize theme based on saved preference or system preference
function initTheme() {
  // Check for saved theme preference or use prefer-color-scheme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  // Remove the flash prevention style if it exists
  const flashStyle = document.getElementById('theme-flash-prevention');
  if (flashStyle) {
    flashStyle.remove();
  }
  
  // Ensure Prism theme is correct
  if (typeof togglePrismTheme === 'function') {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    togglePrismTheme(currentTheme === 'dark');
  }
  
  // Check for saved animation preference - fallback to local storage if settings aren't loaded yet
  let animationEnabled;
  
  if (window.appSettings && window.appSettings.get) {
    // Use settings module if available
    animationEnabled = window.appSettings.get().chat.typingAnimation.enabled;
  } else {
    // Fallback to localStorage
    animationEnabled = localStorage.getItem('animationEnabled');
    if (animationEnabled !== null) {
      animationEnabled = animationEnabled === 'true';
    } else {
      // Default to enabled
      animationEnabled = true;
    }
  }
  
  document.documentElement.setAttribute('data-animation', animationEnabled ? 'enabled' : 'disabled');
}

// Set up theme toggle functionality
function setupThemeToggle() {
  const toggleButton = document.getElementById('theme-toggle');
  if (!toggleButton) return;
  
  // Toggle theme on button click
  toggleButton.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme in settings if available
    if (window.appSettings && window.appSettings.get) {
      const settings = window.appSettings.get();
      
      // Swap assistant and user colors for dark mode
      if (newTheme === 'dark') {
        document.documentElement.style.setProperty('--assistant-color', settings.theme.accentB);
        document.documentElement.style.setProperty('--user-color', settings.theme.accentA);
      } else {
        document.documentElement.style.setProperty('--assistant-color', settings.theme.accentA);
        document.documentElement.style.setProperty('--user-color', settings.theme.accentB);
      }
      
      // Update semi-transparent versions
      document.documentElement.style.setProperty('--assistant-color-light', document.documentElement.style.getPropertyValue('--assistant-color') + '71');
      document.documentElement.style.setProperty('--user-color-light', document.documentElement.style.getPropertyValue('--user-color') + '78');
      
      // Other accent colors that don't change with theme
      document.documentElement.style.setProperty('--accentC-color', settings.theme.accentC || '#e63946');
      document.documentElement.style.setProperty('--accentD-color', settings.theme.accentD || '#2a9d8f');
      document.documentElement.style.setProperty('--accentE-color', settings.theme.accentE || '#8338ec');
      document.documentElement.style.setProperty('--generic-color', settings.theme.genericAccent || '#909090');
    }
  });
}

// Set up animation toggle functionality
function setupAnimationToggle() {
  const animationToggle = document.getElementById('animation-toggle');
  if (!animationToggle) return;
  
  // Set initial toggle state
  let animationState;
  
  if (window.appSettings && window.appSettings.get) {
    // Use settings module if available
    animationState = window.appSettings.get().chat.typingAnimation.enabled ? 'enabled' : 'disabled';
  } else {
    // Fallback to DOM attribute
    animationState = document.documentElement.getAttribute('data-animation') || 'enabled';
  }
  
  const toggleClass = animationState === 'enabled' ? 'enabled' : 'disabled';
  animationToggle.setAttribute('data-state', toggleClass);
  
  // Toggle animation on button click
  animationToggle.addEventListener('click', function() {
    const currentState = document.documentElement.getAttribute('data-animation') || 'enabled';
    const newState = currentState === 'enabled' ? 'disabled' : 'enabled';
    
    document.documentElement.setAttribute('data-animation', newState);
    localStorage.setItem('animationEnabled', newState === 'enabled');
    
    // Update settings if available
    if (window.appSettings && window.appSettings.get) {
      const settings = window.appSettings.get();
      settings.chat.typingAnimation.enabled = newState === 'enabled';
    }
    
    // Update toggle button state
    animationToggle.setAttribute('data-state', newState === 'enabled' ? 'enabled' : 'disabled');
    
    // Update animation state using the animation controller
    if (window.chatAnimations && window.chatAnimations.updateAnimationState) {
      window.chatAnimations.updateAnimationState(newState === 'enabled');
    }
  });
}

// Setup dynamic navigation with footer appearing when needed
function setupDynamicNavigation() {
  const headerNav = document.getElementById('chat-nav');
  const footerNav = document.getElementById('chat-nav-footer');
  const markdownContent = document.getElementById('markdown-content');
  
  if (!headerNav || !footerNav || !markdownContent) return;
  
  // Initially hide the footer nav
  footerNav.classList.remove('visible');
  
  // Function to apply current transition settings
  function applyTransitionSettings() {
    if (window.appSettings && window.appSettings.get) {
      const settings = window.appSettings.get();
      const timeEffects = settings.chat.timeEffects || { transitionDelay: 2, easing: "cubic-bezier(0.19, 1, 0.22, 1)" };
      
      // Apply transition directly as inline style to ensure it's used
      footerNav.style.transition = `transform ${timeEffects.transitionDelay}s ${timeEffects.easing}`;
      console.log(`Applied footer transition: ${timeEffects.transitionDelay}s ${timeEffects.easing}`);
    }
  }
  
  // Apply initial settings
  applyTransitionSettings();
  
  // Listen for settings changes
  window.addEventListener('settingsChanged', applyTransitionSettings);
  
  // Track last state to prevent unnecessary DOM updates
  let isFooterVisible = false;
  
  // Function to check if we should show the footer navigation
  function checkFooterVisibility() {
    // Don't show footer if header is visible
    const headerRect = headerNav.getBoundingClientRect();
    const isHeaderVisible = headerRect.bottom > 0;
    
    if (isHeaderVisible) {
      if (isFooterVisible) {
        footerNav.classList.remove('visible');
        isFooterVisible = false;
      }
      return;
    }
    
    // Check if any chat bubbles are in the bottom 1/3 of the viewport
    const viewportHeight = window.innerHeight;
    const bottomThreshold = viewportHeight * 2/3; // Bottom 1/3 of viewport starts here
    
    // Get all visible chat bubbles
    const messages = markdownContent.querySelectorAll('.message.visible');
    if (messages.length === 0) return;
    
    // Check if any message intersects with bottom third of viewport
    let messagePresentInBottomThird = false;
    
    for (const message of messages) {
      const messageRect = message.getBoundingClientRect();
      
      // Check if message is in the bottom third of the viewport
      if (messageRect.top < viewportHeight && messageRect.bottom > bottomThreshold) {
        messagePresentInBottomThird = true;
        break;
      }
    }
    
    // Show footer only when no messages in bottom third
    if (!messagePresentInBottomThird && !isFooterVisible) {
      requestAnimationFrame(() => {
        footerNav.classList.add('visible');
        isFooterVisible = true;
      });
    } else if (messagePresentInBottomThird && isFooterVisible) {
      requestAnimationFrame(() => {
        footerNav.classList.remove('visible');
        isFooterVisible = false;
      });
    }
  }
  
  // Use a throttled scroll listener for better performance
  let scrollTimeout;
  function throttledScroll() {
    if (!scrollTimeout) {
      scrollTimeout = setTimeout(() => {
        checkFooterVisibility();
        scrollTimeout = null;
      }, 100);
    }
  }
  
  // Initial check and setup scroll listener
  window.addEventListener('scroll', throttledScroll, { passive: true });
  window.addEventListener('resize', throttledScroll, { passive: true });
  
  // Check visibility on animation frames when messages become visible
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'class' &&
          mutation.target.classList.contains('message') &&
          mutation.target.classList.contains('visible')) {
        throttledScroll();
        break;
      }
    }
  });
  
  // Observe when chat messages become visible
  observer.observe(markdownContent, { 
    attributes: true, 
    attributeFilter: ['class'],
    subtree: true,
    childList: true
  });
  
  // Initial check
  setTimeout(checkFooterVisibility, 500);
}

// Initialize on page load 
document.addEventListener('DOMContentLoaded', function() {
  // Apply theme immediately
  initTheme();
  
  // Set up toggles after DOM is ready
  setupThemeToggle();
  setupAnimationToggle();
  setupDynamicNavigation();
});

// Expose methods for use in other scripts
window.themeControls = {
  initTheme,
  setupThemeToggle,
  setupAnimationToggle,
  setupDynamicNavigation
}; 