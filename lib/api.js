import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://gfcnhjvmizcoxxreyife.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY25oanZtaXpjb3h4cmV5aWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjYzODIsImV4cCI6MjA2NDIwMjM4Mn0.uaezuSpGlf6HRzfZqEp9gvh0cdAbs70B5SyTJZeTSI4';

const headers = {
  apikey: SUPABASE_API_KEY,
  'Content-Type': 'application/json',
};

export const loginUser = async (email, password) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.msg || 'Login failed');
  }

  const token = data.access_token;

  const profileRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const userInfo = await profileRes.json();
  const { email: userEmail, user_metadata } = userInfo;

  await AsyncStorage.setItem('token', token);
  await AsyncStorage.setItem('userInfo', JSON.stringify({
    email: userEmail,
    username: user_metadata?.username ?? 'Unknown',
  }));

  return data;
};

export const registerUser = async (email, password, username) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      options: {
        data: { username }, // This sets user_metadata
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.msg || 'Registration failed');
  }

  return data;
};

export const updateUserProfile = async (newUsername) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No user token found.');

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: SUPABASE_API_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        username: newUsername,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || 'Failed to update profile.');
  }

  const safeEmail = typeof data.email === 'string' ? data.email : '';
  const safeUsername =
    data.user_metadata && typeof data.user_metadata.username === 'string'
      ? data.user_metadata.username
      : newUsername;

  await AsyncStorage.setItem(
    'userInfo',
    JSON.stringify({
      email: safeEmail,
      username: safeUsername,
    })
  );

  return data;
};