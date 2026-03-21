import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyC-wOZlBWRgf1AwEpVDDADdCsGzBOUErgE",
  authDomain: "tu-casamiento.firebaseapp.com",
  projectId: "tu-casamiento",
  storageBucket: "tu-casamiento.firebasestorage.app",
  messagingSenderId: "1043598640108",
  appId: "1:1043598640108:web:ee0409cfe6236d465136c9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Messaging initialization needs to be safe as it might not be supported in all environments
export const getMessagingSafe = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (err) {
    console.error('Firebase Messaging is not supported in this environment:', err);
  }
  return null;
};

export { getToken, onMessage };
