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
        hasData: !!outputs.data
      });

      try {
        // AUTH REMOVED - Configure without auth
        Amplify.configure(outputs, { ssr: true });
        console.log('✅ Amplify configured successfully (auth disabled)');
      } catch (err) {
        console.error('❌ Error configuring Amplify:', err);
      }
    }
  }, []);

  return null;
}