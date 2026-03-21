importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA7VJ87wMBNemcnsKQfCNy3HZl4xTsKGh8",
  authDomain: "deoportunidades.firebaseapp.com",
  projectId: "deoportunidades",
  storageBucket: "deoportunidades.firebasestorage.app",
  messagingSenderId: "194924574195",
  appId: "1:194924574195:web:8335fe4e621374f87ace86"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
