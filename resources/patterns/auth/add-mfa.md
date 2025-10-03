# Add Multi-Factor Authentication (MFA)

**Step-by-step pattern for adding SMS and TOTP (authenticator app) MFA to your Amplify Gen 2 app**

---

## ✅ Prerequisites

- Basic auth already configured (`amplify/auth/resource.ts` exists)
- Understanding of MFA modes: OPTIONAL (user choice) vs REQUIRED (enforced)

---

## 📋 Step 1: Update Auth Configuration

Update `amplify/auth/resource.ts`:

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  // Add multi-factor authentication
  multifactor: {
    mode: 'OPTIONAL', // or 'REQUIRED'
    sms: true,
    totp: true, // Time-based one-time password (authenticator apps)
  },
});
```

**MFA Modes:**
- `'OPTIONAL'` - Users can choose to enable MFA
- `'REQUIRED'` - All users must set up MFA before accessing app
- `'OFF'` - MFA disabled (default)

**MFA Methods:**
- `sms: true` - SMS text message codes
- `totp: true` - Authenticator apps (Google Authenticator, Authy, 1Password, etc.)

---

## 📋 Step 2: Add Phone Number Attribute (for SMS MFA)

If using SMS MFA, add phone number to user attributes:

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  multifactor: {
    mode: 'OPTIONAL',
    sms: true,
    totp: true,
  },

  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    phoneNumber: {
      required: false, // Make required if MFA mode is REQUIRED
      mutable: true,
    },
  },
});
```

**Important:**
- Phone number must be in E.164 format: `+1234567890`
- SMS MFA requires verified phone number

---

## 📋 Step 3: Redeploy Sandbox

```bash
npx ampx sandbox
```

---

## 📋 Step 4: Client-Side - Set Up TOTP (Authenticator App)

### Generate QR Code for Authenticator App

```typescript
"use client";

import { setUpTOTP, verifyTOTPToken } from 'aws-amplify/auth';
import QRCode from 'qrcode';

async function setupAuthenticator() {
  try {
    // Step 1: Set up TOTP
    const totpSetup = await setUpTOTP();

    // Step 2: Generate QR code
    const appName = 'MyApp';
    const setupUri = totpSetup.getSetupUri(appName);

    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(setupUri.toString());

    // Display QR code to user
    return {
      qrCode: qrCodeDataUrl,
      secretCode: totpSetup.sharedSecret, // Backup code for manual entry
    };
  } catch (error: any) {
    console.error('TOTP setup error:', error);
    throw error;
  }
}
```

### Verify and Enable TOTP

```typescript
import { verifyTOTPToken, updateMFAPreference } from 'aws-amplify/auth';

async function verifyAndEnableTOTP(code: string) {
  try {
    // Step 1: Verify the code from authenticator app
    await verifyTOTPToken({ challengeAnswer: code });

    // Step 2: Enable TOTP as preferred MFA method
    await updateMFAPreference({
      totp: 'PREFERRED', // Can be 'PREFERRED' or 'ENABLED'
    });

    console.log('TOTP MFA enabled successfully!');
  } catch (error: any) {
    console.error('TOTP verification error:', error);
    alert('Invalid code. Please try again.');
  }
}
```

---

## 📋 Step 5: Client-Side - Set Up SMS MFA

### Add Phone Number

```typescript
import { updateUserAttributes, verifyUserAttribute } from 'aws-amplify/auth';

async function addPhoneNumber(phoneNumber: string) {
  try {
    // Step 1: Update phone number attribute
    const result = await updateUserAttributes({
      userAttributes: {
        phone_number: phoneNumber, // Must be E.164 format: +1234567890
      },
    });

    // Step 2: Verify phone number with SMS code
    if (result.phone_number?.deliveryMedium === 'SMS') {
      console.log('Verification code sent to phone');
      // Show code input to user
      return { needsVerification: true };
    }
  } catch (error: any) {
    console.error('Phone number error:', error);
    throw error;
  }
}

async function verifyPhoneNumber(code: string) {
  try {
    await verifyUserAttribute({
      userAttributeKey: 'phone_number',
      confirmationCode: code,
    });
    console.log('Phone number verified!');
  } catch (error: any) {
    console.error('Verification error:', error);
    throw error;
  }
}
```

### Enable SMS MFA

```typescript
import { updateMFAPreference } from 'aws-amplify/auth';

async function enableSMSMFA() {
  try {
    await updateMFAPreference({
      sms: 'PREFERRED', // Can be 'PREFERRED' or 'ENABLED'
    });
    console.log('SMS MFA enabled!');
  } catch (error: any) {
    console.error('SMS MFA error:', error);
    throw error;
  }
}
```

---

## 📋 Step 6: Handle MFA Challenge During Sign In

When MFA is enabled, sign in requires two steps:

```typescript
import { signIn, confirmSignIn } from 'aws-amplify/auth';

async function handleSignInWithMFA(email: string, password: string) {
  try {
    // Step 1: Initial sign in
    const { isSignedIn, nextStep } = await signIn({
      username: email,
      password,
    });

    // Step 2: Check if MFA is required
    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
      // Show TOTP code input (authenticator app)
      console.log('Enter code from authenticator app');
      return { needsMFA: true, mfaType: 'TOTP' };
    }

    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
      // Show SMS code input
      console.log('Enter code from SMS');
      return { needsMFA: true, mfaType: 'SMS' };
    }

    if (isSignedIn) {
      // No MFA required or already completed
      return { needsMFA: false };
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  }
}

async function confirmMFACode(code: string) {
  try {
    const { isSignedIn } = await confirmSignIn({
      challengeResponse: code,
    });

    if (isSignedIn) {
      console.log('Signed in successfully!');
      // Redirect to dashboard
    }
  } catch (error: any) {
    console.error('MFA code error:', error);
    alert('Invalid code. Please try again.');
  }
}
```

---

## 📋 Step 7: Get Current MFA Preferences

```typescript
import { fetchMFAPreference } from 'aws-amplify/auth';

async function getMFAStatus() {
  try {
    const { preferred, enabled } = await fetchMFAPreference();

    return {
      preferredMFA: preferred, // 'SMS' | 'TOTP' | 'NOMFA'
      enabledMethods: enabled, // ['SMS', 'TOTP'] or []
      hasMFA: preferred !== 'NOMFA',
    };
  } catch (error: any) {
    console.error('Error fetching MFA preferences:', error);
    throw error;
  }
}
```

---

## 🎯 Complete MFA Settings Page Example

```typescript
"use client";

import { useState, useEffect } from 'react';
import {
  fetchMFAPreference,
  setUpTOTP,
  verifyTOTPToken,
  updateMFAPreference,
  updateUserAttributes,
  verifyUserAttribute,
} from 'aws-amplify/auth';
import QRCode from 'qrcode';

export default function MFASettingsPage() {
  const [mfaStatus, setMfaStatus] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadMFAStatus();
  }, []);

  async function loadMFAStatus() {
    const { preferred, enabled } = await fetchMFAPreference();
    setMfaStatus({ preferred, enabled });
  }

  async function enableTOTP() {
    const totpSetup = await setUpTOTP();
    const uri = totpSetup.getSetupUri('MyApp');
    const qr = await QRCode.toDataURL(uri.toString());
    setQrCode(qr);
  }

  async function verifyTOTP() {
    await verifyTOTPToken({ challengeAnswer: totpCode });
    await updateMFAPreference({ totp: 'PREFERRED' });
    await loadMFAStatus();
    setQrCode(null);
    alert('TOTP enabled!');
  }

  async function addPhone() {
    await updateUserAttributes({
      userAttributes: { phone_number: phoneNumber },
    });
    alert('Verification code sent!');
  }

  async function verifySMS() {
    await verifyUserAttribute({
      userAttributeKey: 'phone_number',
      confirmationCode: smsCode,
    });
    await updateMFAPreference({ sms: 'PREFERRED' });
    await loadMFAStatus();
    alert('SMS MFA enabled!');
  }

  return (
    <div>
      <h1>MFA Settings</h1>

      {mfaStatus && (
        <div>
          <p>Preferred MFA: {mfaStatus.preferred}</p>
          <p>Enabled Methods: {mfaStatus.enabled.join(', ')}</p>
        </div>
      )}

      <section>
        <h2>Authenticator App (TOTP)</h2>
        {!qrCode ? (
          <button onClick={enableTOTP}>Set Up Authenticator</button>
        ) : (
          <div>
            <img src={qrCode} alt="QR Code" />
            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="Enter code from app"
            />
            <button onClick={verifyTOTP}>Verify Code</button>
          </div>
        )}
      </section>

      <section>
        <h2>SMS MFA</h2>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1234567890"
        />
        <button onClick={addPhone}>Add Phone</button>

        <input
          type="text"
          value={smsCode}
          onChange={(e) => setSmsCode(e.target.value)}
          placeholder="Verification code"
        />
        <button onClick={verifySMS}>Verify SMS</button>
      </section>
    </div>
  );
}
```

---

## ⚠️ Common Pitfalls

1. **Phone number format** → Must use E.164 format: `+1234567890`
2. **Not verifying TOTP token** → Must call `verifyTOTPToken` before enabling
3. **Not setting preference** → Call `updateMFAPreference` to activate MFA
4. **Required mode without phone** → If MFA is REQUIRED and SMS enabled, phone must be required
5. **Not handling MFA in sign in** → Check `nextStep.signInStep` for MFA challenges

---

## 🔒 Security Best Practices

1. **Force MFA for admins** → Use REQUIRED mode for admin user groups
2. **Backup codes** → Provide backup recovery codes for TOTP
3. **Multiple methods** → Allow both SMS and TOTP for flexibility
4. **Recovery flow** → Implement account recovery for lost MFA devices
5. **Rate limiting** → Limit MFA code attempts

---

## 📱 Recommended Authenticator Apps

- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (iOS/Android/Desktop)
- **Bitwarden** (iOS/Android/Desktop)

---

## ✅ Checklist

Before moving on, verify:
- [ ] MFA configured in `amplify/auth/resource.ts`
- [ ] Phone number attribute added (if using SMS)
- [ ] Sandbox redeployed successfully
- [ ] TOTP setup with QR code implemented
- [ ] TOTP verification flow working
- [ ] SMS setup and verification implemented
- [ ] MFA preference update working
- [ ] Sign in MFA challenge handled
- [ ] MFA settings page created
- [ ] Both TOTP and SMS methods tested

---

**You're done! Your app now has multi-factor authentication! 🔐**
