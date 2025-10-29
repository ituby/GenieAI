/**
 * In-App Purchase Configuration
 * 
 * Product IDs for iOS and Android
 * Make sure these match exactly with what you create in App Store Connect and Google Play Console
 */

import { Platform } from 'react-native';

// Token Purchase Product IDs
export const TOKEN_PRODUCTS = {
  TOKENS_50: Platform.select({
    ios: 'com.ituby.genie.ai.tokens.50',
    android: 'com.ituby.genie.ai.tokens.50',
  })!,
  TOKENS_100: Platform.select({
    ios: 'com.ituby.genie.ai.tokens.100',
    android: 'com.ituby.genie.ai.tokens.100',
  })!,
  TOKENS_250: Platform.select({
    ios: 'com.ituby.genie.ai.tokens.250',
    android: 'com.ituby.genie.ai.tokens.250',
  })!,
  TOKENS_500: Platform.select({
    ios: 'com.ituby.genie.ai.tokens.500',
    android: 'com.ituby.genie.ai.tokens.500',
  })!,
  TOKENS_1000: Platform.select({
    ios: 'com.ituby.genie.ai.tokens.1000',
    android: 'com.ituby.genie.ai.tokens.1000',
  })!,
  TOKENS_2000: Platform.select({
    ios: 'com.ituby.genie.ai.tokens.2000',
    android: 'com.ituby.genie.ai.tokens.2000',
  })!,
};

// Subscription Product IDs
export const SUBSCRIPTION_PRODUCTS = {
  PREMIUM_MONTHLY: Platform.select({
    ios: 'com.ituby.genie.ai.premium.monthly',
    android: 'com.ituby.genie.ai.premium.monthly',
  })!,
};

// All product IDs combined for initialization
export const ALL_PRODUCT_IDS = [
  ...Object.values(TOKEN_PRODUCTS),
  ...Object.values(SUBSCRIPTION_PRODUCTS),
];

// Product metadata (for display purposes)
export interface TokenPackage {
  productId: string;
  amount: number;
  price: number;
  fallbackPrice: string; // Display price if IAP price not available
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    productId: TOKEN_PRODUCTS.TOKENS_50,
    amount: 50,
    price: 2.99,
    fallbackPrice: '$2.99',
  },
  {
    productId: TOKEN_PRODUCTS.TOKENS_100,
    amount: 100,
    price: 4.99,
    fallbackPrice: '$4.99',
  },
  {
    productId: TOKEN_PRODUCTS.TOKENS_250,
    amount: 250,
    price: 12.99,
    fallbackPrice: '$12.99',
  },
  {
    productId: TOKEN_PRODUCTS.TOKENS_500,
    amount: 500,
    price: 24.99,
    fallbackPrice: '$24.99',
  },
  {
    productId: TOKEN_PRODUCTS.TOKENS_1000,
    amount: 1000,
    price: 49.99,
    fallbackPrice: '$49.99',
  },
  {
    productId: TOKEN_PRODUCTS.TOKENS_2000,
    amount: 2000,
    price: 99.99,
    fallbackPrice: '$99.99',
  },
];

export interface SubscriptionTier {
  productId: string;
  name: string;
  price: number;
  fallbackPrice: string;
  tokens: number;
  features: string[];
  popular?: boolean;
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    productId: SUBSCRIPTION_PRODUCTS.PREMIUM_MONTHLY,
    name: 'Premium',
    price: 14.99,
    fallbackPrice: '$14.99',
    tokens: 1000,
    features: [
      '1,000 tokens per month',
      'Advanced AI models',
      'Priority support',
      'Early access to features',
    ],
    popular: true,
  },
];

