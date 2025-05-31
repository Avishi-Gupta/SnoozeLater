import { Redirect } from 'expo-router';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

export default function Index() {
  return <Redirect href="/login" />;
}