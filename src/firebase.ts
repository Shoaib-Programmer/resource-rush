// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import {
    getDatabase,
    ref,
    set,
    get,
    child,
    onValue,
    push,
    update,
} from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: 'AIzaSyAQODAGtso6rzV8oPrWsvSFdFMUOYJuOuI',
    authDomain: 'resource-rush-968e4.firebaseapp.com',
    databaseURL:
        'https://resource-rush-968e4-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'resource-rush-968e4',
    storageBucket: 'resource-rush-968e4.firebasestorage.app',
    messagingSenderId: '410389692649',
    appId: '1:410389692649:web:6424fa7564490d03c6b078',
    measurementId: 'G-8JSET45W8R',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Get a reference to the database service
const db = getDatabase(app);
const auth = getAuth(app);

export { analytics, db, auth, ref, set, get, child, onValue, push, update };
