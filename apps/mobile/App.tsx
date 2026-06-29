import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { miraHtml } from './src/miraHtml';

// The Mira Claude Design is a self-contained React doc (support.js loads React
// from unpkg and renders it). We render it verbatim in a WebView for an exact,
// pixel-for-pixel match. baseUrl gives the page a real origin so support.js's
// unpkg fetch for React succeeds (network required on first paint).
export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <WebView
        style={styles.web}
        originWhitelist={['*']}
        source={{ html: miraHtml, baseUrl: 'https://localhost/' }}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        // bounces=false + locked html/body kill the web-page rubber-band pull; inner scrolls still work
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // matches the design's outer radial-gradient backdrop
  container: { flex: 1, backgroundColor: '#0c0d10' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
