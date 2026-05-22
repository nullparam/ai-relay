import * as fs from 'fs';
import * as path from 'path';
import { relayRequest } from '../src/lib/relay/relay';
import { record429, getCircuitStatus } from '../src/lib/relay/rate-limiter';

// Manually load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

async function runTests() {
  console.log('--- START TEST ---');

  const model = 'mimo-v2.5-pro-coding'; // primary provider: xiaomi_coding

  // 1. Reset rate limiter / circuit breaker for xiaomi_coding
  // We call record429 5 times to trip the circuit breaker
  console.log('Tripping circuit breaker for xiaomi_coding...');
  for (let i = 0; i < 5; i++) {
    record429('xiaomi_coding');
  }

  const status = getCircuitStatus('xiaomi_coding');
  console.log(`Circuit status: state=${status.state}, consecutiveFailures=${status.consecutiveFailures}`);

  // Test Case A: No fallback configured. Should fail with 429.
  console.log('\n--- Test Case A: No fallback configured ---');
  (global as any).__mockFallbackChain = async () => [];

  try {
    await relayRequest({
      model,
      messages: [{ role: 'user', content: 'test' }],
    });
    console.error('❌ Test Case A failed: expected 429 error, but request succeeded');
  } catch (err: any) {
    if (err.status === 429 && err.message.includes('circuit breaker open for xiaomi_coding')) {
      console.log('✅ Test Case A passed: correctly threw 429 rate limit error when no fallback configured');
    } else {
      console.error('❌ Test Case A failed with unexpected error:', err);
    }
  }

  // Test Case B: Fallback configured to 'lpgpt'. Should bypass xiaomi_coding and try 'lpgpt'.
  console.log('\n--- Test Case B: Fallback configured to lpgpt ---');
  // We route to lpgpt, specifying the model as 'gpt-5.3' (supported by lpgpt)
  (global as any).__mockFallbackChain = async () => ['lpgpt:gpt-5.3'];

  try {
    console.log('Sending relay request...');
    const res = await relayRequest({
      model,
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });
    console.log('Relay response status:', res.response.status);
    console.log('Relay provider:', res.provider.name);
    if (res.provider.name === 'lpgpt') {
      console.log('✅ Test Case B passed: successfully fell back to lpgpt!');
    } else {
      console.error(`❌ Test Case B failed: fell back to unexpected provider: ${res.provider.name}`);
    }
  } catch (err: any) {
    console.error('❌ Test Case B failed with error:', err);
  }

  // Clean up global hook
  delete (global as any).__mockFallbackChain;
  console.log('\n--- END TEST ---');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
});
