import { supabase } from '../lib/supabase';

export interface QRToken {
  id: string;
  customer_id: string;
  restaurant_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface QRPayload {
  customerId: string;
  restaurantId: string;
  timestamp: number;
  token: string;
}

export class QRTokenService {
  // Generate a secure, time-limited QR token for customer identification
  static async generateCustomerQRToken(
    restaurantId: string,
    customerId: string,
    expiresInMinutes: number = 5
  ): Promise<string> {
    try {
      // Generate a random secure token
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const token = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Set expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

      // Store token in database
      const { data, error } = await supabase
        .from('qr_tokens')
        .insert({
          customer_id: customerId,
          restaurant_id: restaurantId,
          token,
          expires_at: expiresAt.toISOString(),
          used: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing QR token:', error);
        throw new Error('Failed to generate QR token');
      }

      // Create the QR payload
      const payload: QRPayload = {
        customerId,
        restaurantId,
        timestamp: Date.now(),
        token,
      };

      // Encode as base64 for QR code
      return btoa(JSON.stringify(payload));
    } catch (error) {
      console.error('Error in generateCustomerQRToken:', error);
      throw error;
    }
  }

  // Generate a reward redemption QR token
  static async generateRedemptionQRToken(
    restaurantId: string,
    customerId: string,
    rewardId: string,
    expiresInMinutes: number = 10
  ): Promise<string> {
    try {
      // Generate a random secure token
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const token = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Set expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

      // Store token in database with reward_id
      const { data, error } = await supabase
        .from('qr_tokens')
        .insert({
          customer_id: customerId,
          restaurant_id: restaurantId,
          token,
          reward_id: rewardId,
          expires_at: expiresAt.toISOString(),
          used: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing redemption QR token:', error);
        throw new Error('Failed to generate redemption QR token');
      }

      // Create the QR payload with reward info
      const payload = {
        type: 'redemption',
        customerId,
        restaurantId,
        rewardId,
        timestamp: Date.now(),
        token,
      };

      // Encode as base64 for QR code
      return btoa(JSON.stringify(payload));
    } catch (error) {
      console.error('Error in generateRedemptionQRToken:', error);
      throw error;
    }
  }

  // Verify and consume a QR token (for staff scanning)
  static async verifyAndConsumeToken(
    encodedPayload: string
  ): Promise<{
    valid: boolean;
    payload?: any;
    error?: string;
  }> {
    try {
      // Decode the payload
      let payload;
      try {
        payload = JSON.parse(atob(encodedPayload));
      } catch (e) {
        return { valid: false, error: 'Invalid QR code format' };
      }

      // Verify required fields
      if (!payload.customerId || !payload.restaurantId || !payload.token) {
        return { valid: false, error: 'Missing required fields in QR code' };
      }

      // Check if token exists and is valid
      const { data: tokenData, error: tokenError } = await supabase
        .from('qr_tokens')
        .select('*')
        .eq('token', payload.token)
        .eq('customer_id', payload.customerId)
        .eq('restaurant_id', payload.restaurantId)
        .eq('used', false)
        .maybeSingle();

      if (tokenError) {
        console.error('Error verifying token:', tokenError);
        return { valid: false, error: 'Error verifying QR code' };
      }

      if (!tokenData) {
        return { valid: false, error: 'QR code not found or already used' };
      }

      // Check if token has expired
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        return { valid: false, error: 'QR code has expired' };
      }

      // Mark token as used
      const { error: updateError } = await supabase
        .from('qr_tokens')
        .update({ used: true })
        .eq('id', tokenData.id);

      if (updateError) {
        console.error('Error marking token as used:', updateError);
        return { valid: false, error: 'Error processing QR code' };
      }

      return { valid: true, payload };
    } catch (error) {
      console.error('Error in verifyAndConsumeToken:', error);
      return { valid: false, error: 'Failed to verify QR code' };
    }
  }

  // Cleanup expired tokens (can be called periodically)
  static async cleanupExpiredTokens(restaurantId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('qr_tokens')
        .delete()
        .eq('restaurant_id', restaurantId)
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired tokens:', error);
      }
    } catch (error) {
      console.error('Error in cleanupExpiredTokens:', error);
    }
  }

  // Get token info without consuming it (for preview/debugging)
  static async getTokenInfo(encodedPayload: string): Promise<any> {
    try {
      const payload = JSON.parse(atob(encodedPayload));

      const { data: tokenData } = await supabase
        .from('qr_tokens')
        .select('*, customer:customers(*)')
        .eq('token', payload.token)
        .eq('customer_id', payload.customerId)
        .eq('restaurant_id', payload.restaurantId)
        .maybeSingle();

      return tokenData;
    } catch (error) {
      console.error('Error in getTokenInfo:', error);
      return null;
    }
  }
}
