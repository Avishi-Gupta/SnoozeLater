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
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.msg ||'Login failed');
  }

  await AsyncStorage.setItem('supabase_token', data.access_token);
  return data;
};

export const registerUser = async (email, password) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.msg || 'Registration failed');
  }

  return data;
};
