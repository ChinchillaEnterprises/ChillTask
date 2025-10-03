"use client";

import { Amplify } from "aws-amplify";
import { useEffect } from "react";

// Import the outputs file statically - it exists in your project
import outputs from "../../amplify_outputs.json";

export default function ConfigureAmplifyClientSide() {
  useEffect(() => {
    // Configure Amplify on mount with the outputs file
    if (typeof window !== 'undefined' && outputs) {
      console.log('📱 Configuring Amplify with outputs:', {
        hasAuth: !!outputs.auth,
        hasOAuth: !!outputs.auth?.oauth,
        oauthDomain: outputs.auth?.oauth?.domain,
        identityProviders: outputs.auth?.oauth?.identity_providers,
        redirectSignIn: outputs.auth?.oauth?.redirect_sign_in_uri
      });

      try {
        Amplify.configure(outputs, { ssr: true });
        console.log('✅ Amplify configured successfully in ConfigureAmplify component');

        // Store in window for other components to check
        window.amplifyConfig = outputs;
        console.log('✅ Window.amplifyConfig set with OAuth domain:', outputs.auth?.oauth?.domain);
      } catch (err) {
        console.error('❌ Error configuring Amplify:', err);
      }
    }
  }, []);

  return null;
}