// Basic Service Worker for PWA
// This minimal service worker enables PWA installation on Android Chrome

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  // Perform install steps
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  // Perform activate steps
});

self.addEventListener('fetch', (event) => {
  // Handle fetch events if needed
  // For basic PWA, we can leave this empty
});