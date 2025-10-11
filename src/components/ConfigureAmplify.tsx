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
        hasData: !!outputs.data
      });

      try {
        Amplify.configure(outputs, { ssr: true });
        console.log('✅ Amplify configured successfully in ConfigureAmplify component');

        // Store in window for other components to check
        window.amplifyConfig = outputs;
        console.log('✅ Window.amplifyConfig set successfully');
      } catch (err) {
        console.error('❌ Error configuring Amplify:', err);
      }
    }
  }, []);

  return null;
}