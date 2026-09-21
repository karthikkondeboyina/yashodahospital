/**
 * Automated Verification Suite for Sammy Voice Agent Integration
 * Tests:
 * 1. Voice Session initialization & greeting
 * 2. Strict Emergency Gate override (chest pain -> 105910/108)
 * 3. Conversational multi-turn appointment booking
 * 4. Transactional ACID booking confirmation & reference generation
 * 5. Single goodbye / No-loop rule
 * 6. Telephony Webhook function calling tool execution
 */

const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runVoiceTests() {
  console.log('====================================================');
  console.log('🎙️ Starting Sammy Voice Agent Integration Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Voice Session Init
    const sessionRes = await request('POST', '/voice/session', {
      phone: '+91 95132 62681',
      email: 'karthikkondeboyina@gmail.com'
    });
    assert(sessionRes.status === 200 && sessionRes.body.reply.includes('Sammy from Yashoda Hospitals'), '1. Voice Session Init returns Sammy greeting');
    const sessionId = sessionRes.body.sessionId;

    // 2. Emergency Override Test
    const emergencyRes = await request('POST', '/voice/interact', {
      sessionId: 'voice_emerg_' + Date.now(),
      message: 'I have severe chest pain and cannot breathe'
    });
    assert(
      emergencyRes.body.isEmergency === true &&
      emergencyRes.body.reply.includes('one zero five nine one zero') &&
      emergencyRes.body.callEnded === true,
      '2. Strict Emergency Gate triggers and provides 105910 and 108 helpline'
    );

    // 3. Multi-turn booking flow
    // Step A: Need / Problem
    const turn1 = await request('POST', '/voice/interact', {
      sessionId,
      message: 'I have stomach problem and indigestion'
    });
    assert(turn1.body.reply.includes('gastro') && turn1.body.reply.includes('campuses'), '3. Step 1: Identifies gastro and presents 4 campuses');

    // Step B: Campus choice
    const turn2 = await request('POST', '/voice/interact', {
      sessionId,
      message: 'Somajiguda'
    });
    assert(turn2.body.reply.includes('Somajiguda') && turn2.body.reply.includes('Dr.'), '4. Step 2: Selects Somajiguda and offers doctor by name');

    // Step C: Confirm doctor
    const turn3 = await request('POST', '/voice/interact', {
      sessionId,
      message: 'Yes, that works'
    });
    assert(turn3.body.reply.includes('good name'), '5. Step 3: Agrees to doctor and asks patient name');

    // Step D: Name
    const turn4 = await request('POST', '/voice/interact', {
      sessionId,
      message: 'My name is Karthik Kumar'
    });
    assert(turn4.body.reply.includes('Karthik Kumar') && turn4.body.reply.includes('when would you like'), '6. Step 4: Acknowledges name and asks timing');

    // Step E: Timing
    const turn5 = await request('POST', '/voice/interact', {
      sessionId,
      message: 'Tomorrow eleven AM'
    });
    assert(turn5.body.reply.includes('Karthik Kumar') && turn5.body.reply.includes('Is that correct?'), '7. Step 5: Readback sentence before booking');

    // Step F: Confirm & Execute Booking
    const turn6 = await request('POST', '/voice/interact', {
      sessionId,
      message: 'Yes confirm'
    });
    assert(
      turn6.body.booking &&
      turn6.body.booking.appointment_ref &&
      turn6.body.reply.includes('appointment is confirmed'),
      '8. Step 6: ACID Booking committed with reference & confirmation'
    );

    // Step G: Goodbye / No-loop
    const turn7 = await request('POST', '/voice/interact', {
      sessionId,
      message: 'No thanks, bye'
    });
    assert(turn7.body.callEnded === true && turn7.body.reply.includes('take care'), '9. Step 7: Single warm goodbye executed');

    // Step H: Post-goodbye utterance
    const turn8 = await request('POST', '/voice/interact', {
      sessionId,
      message: 'thank you'
    });
    assert(turn8.body.reply === 'Bye!' && turn8.body.callEnded === true, '10. Step 8: Strict No-Loop Rule enforces one-word "Bye!" reply');

    // 4. Webhook tool calling endpoint test
    const webhookRes = await request('POST', '/voice/webhook', {
      message: {
        function_call: {
          name: 'get_doctors',
          arguments: {}
        }
      }
    });
    assert(webhookRes.status === 200 && Array.isArray(webhookRes.body.result) && webhookRes.body.result.length > 0, '11. Voice Webhook function calling (get_doctors) works');

  } catch (err) {
    console.error('Test run failed with exception:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runVoiceTests();
