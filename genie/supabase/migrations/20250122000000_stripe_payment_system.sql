-- ============================================================================
-- Stripe Payment System Migration
-- ============================================================================
-- This migration creates all necessary tables and functions for a complete
-- Stripe payment system with support for:
-- - Token purchases (one-time payments)
-- - Monthly subscriptions
-- - Payment history and tracking
-- - Failed payment handling
-- - Subscription management (cancel, reinstate, proration)
-- ============================================================================

-- ============================================================================
-- 1. STRIPE CUSTOMERS TABLE
-- ============================================================================
-- Links users to their Stripe customer IDs
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

-- Enable RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own stripe customer data" ON stripe_customers
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 2. SUBSCRIPTIONS TABLE
-- ============================================================================
-- Tracks active and historical subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    stripe_price_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'active', 'canceled', 'incomplete', 'incomplete_expired', 
        'past_due', 'paused', 'trialing', 'unpaid'
    )),
    monthly_tokens INTEGER NOT NULL DEFAULT 1000,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, stripe_subscription_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 3. PAYMENTS TABLE
-- ============================================================================
-- Records all payment transactions (both one-time and subscription)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    stripe_invoice_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN (
        'pending', 'succeeded', 'failed', 'canceled', 'refunded'
    )),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('token_purchase', 'subscription')),
    tokens_amount INTEGER, -- For token purchases
    subscription_id UUID REFERENCES subscriptions(id),
    failure_code TEXT,
    failure_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 4. PAYMENT NOTIFICATIONS TABLE
-- ============================================================================
-- Tracks notifications sent for failed payments
CREATE TABLE IF NOT EXISTS payment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'payment_failed', 'payment_retry', 'subscription_canceled', 'subscription_renewed'
    )),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'both')),
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_notifications_payment_id ON payment_notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_user_id ON payment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_type ON payment_notifications(notification_type);

-- Enable RLS
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own payment notifications" ON payment_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 5. TOKEN BALANCE HISTORY TABLE
-- ============================================================================
-- Tracks all token balance changes for audit trail
CREATE TABLE IF NOT EXISTS token_balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    change_amount INTEGER NOT NULL, -- Positive for additions, negative for usage
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN (
        'purchase', 'subscription_renewal', 'task_creation', 'plan_generation', 
        'goal_suggestion', 'manual_adjustment', 'refund'
    )),
    reference_id UUID, -- Can reference payment_id, goal_id, task_id, etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_token_balance_history_user_id ON token_balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_token_balance_history_created_at ON token_balance_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_balance_history_type ON token_balance_history(change_type);

-- Enable RLS
ALTER TABLE token_balance_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own token history" ON token_balance_history
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 6. USER_TOKENS TABLE ENHANCEMENTS
-- ============================================================================
-- Check if user_tokens table exists, if not create it
CREATE TABLE IF NOT EXISTS user_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tokens_remaining INTEGER NOT NULL DEFAULT 100,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    monthly_tokens INTEGER NOT NULL DEFAULT 100,
    is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
    last_reset_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add stripe_customer_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_tokens' 
        AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE user_tokens ADD COLUMN stripe_customer_id TEXT;
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_tokens' 
        AND policyname = 'Users can view own tokens'
    ) THEN
        CREATE POLICY "Users can view own tokens" ON user_tokens
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_tokens' 
        AND policyname = 'Users can update own tokens'
    ) THEN
        CREATE POLICY "Users can update own tokens" ON user_tokens
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 7. FUNCTIONS FOR TOKEN MANAGEMENT
-- ============================================================================

-- Function to add tokens and record in history
CREATE OR REPLACE FUNCTION add_tokens_to_user(
    p_user_id UUID,
    p_tokens INTEGER,
    p_change_type TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT tokens_remaining INTO v_current_balance
    FROM user_tokens
    WHERE user_id = p_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User tokens record not found for user_id: %', p_user_id;
    END IF;

    v_new_balance := v_current_balance + p_tokens;

    -- Update balance
    UPDATE user_tokens
    SET 
        tokens_remaining = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record in history
    INSERT INTO token_balance_history (
        user_id, change_amount, balance_before, balance_after,
        change_type, reference_id, description
    ) VALUES (
        p_user_id, p_tokens, v_current_balance, v_new_balance,
        p_change_type, p_reference_id, p_description
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct tokens and record in history
CREATE OR REPLACE FUNCTION deduct_tokens_from_user(
    p_user_id UUID,
    p_tokens INTEGER,
    p_change_type TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT tokens_remaining INTO v_current_balance
    FROM user_tokens
    WHERE user_id = p_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User tokens record not found for user_id: %', p_user_id;
    END IF;

    IF v_current_balance < p_tokens THEN
        RETURN FALSE; -- Insufficient balance
    END IF;

    v_new_balance := v_current_balance - p_tokens;

    -- Update balance
    UPDATE user_tokens
    SET 
        tokens_remaining = v_new_balance,
        tokens_used = tokens_used + p_tokens,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record in history
    INSERT INTO token_balance_history (
        user_id, change_amount, balance_before, balance_after,
        change_type, reference_id, description
    ) VALUES (
        p_user_id, -p_tokens, v_current_balance, v_new_balance,
        p_change_type, p_reference_id, p_description
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. ENHANCED SUBSCRIPTION MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to activate subscription (enhanced version)
CREATE OR REPLACE FUNCTION subscribe_user(
    p_user_id UUID,
    p_monthly_tokens INTEGER,
    p_stripe_subscription_id TEXT DEFAULT NULL,
    p_stripe_customer_id TEXT DEFAULT NULL,
    p_stripe_price_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- Update user_tokens to mark as subscribed
    UPDATE user_tokens
    SET 
        is_subscribed = TRUE,
        monthly_tokens = p_monthly_tokens,
        tokens_remaining = tokens_remaining + p_monthly_tokens,
        last_reset_at = NOW(),
        stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Get updated balance for history
    SELECT tokens_remaining INTO v_current_balance
    FROM user_tokens
    WHERE user_id = p_user_id;

    -- Record subscription tokens in history
    INSERT INTO token_balance_history (
        user_id, 
        change_amount, 
        balance_before, 
        balance_after,
        change_type, 
        description
    ) VALUES (
        p_user_id, 
        p_monthly_tokens, 
        v_current_balance - p_monthly_tokens, 
        v_current_balance,
        'subscription_renewal',
        'Monthly subscription token grant'
    );

    -- Create or update subscription record if Stripe IDs provided
    IF p_stripe_subscription_id IS NOT NULL THEN
        INSERT INTO subscriptions (
            user_id,
            stripe_subscription_id,
            stripe_customer_id,
            stripe_price_id,
            status,
            monthly_tokens,
            current_period_start,
            current_period_end
        ) VALUES (
            p_user_id,
            p_stripe_subscription_id,
            p_stripe_customer_id,
            p_stripe_price_id,
            'active',
            p_monthly_tokens,
            NOW(),
            NOW() + INTERVAL '1 month'
        )
        ON CONFLICT (user_id, stripe_subscription_id)
        DO UPDATE SET
            status = 'active',
            monthly_tokens = p_monthly_tokens,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel subscription (enhanced version)
CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id UUID,
    p_immediate BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
    -- Update user_tokens
    UPDATE user_tokens
    SET 
        is_subscribed = FALSE,
        monthly_tokens = 100, -- Reset to free tier
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Update subscription records
    UPDATE subscriptions
    SET 
        status = 'canceled',
        cancel_at_period_end = NOT p_immediate,
        canceled_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id 
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reinstate canceled subscription
CREATE OR REPLACE FUNCTION reinstate_subscription(
    p_user_id UUID,
    p_stripe_subscription_id TEXT
) RETURNS VOID AS $$
DECLARE
    v_monthly_tokens INTEGER;
BEGIN
    -- Get monthly tokens from subscription
    SELECT monthly_tokens INTO v_monthly_tokens
    FROM subscriptions
    WHERE user_id = p_user_id 
    AND stripe_subscription_id = p_stripe_subscription_id;

    IF v_monthly_tokens IS NULL THEN
        RAISE EXCEPTION 'Subscription not found';
    END IF;

    -- Reactivate subscription
    UPDATE subscriptions
    SET 
        status = 'active',
        cancel_at_period_end = FALSE,
        canceled_at = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id 
    AND stripe_subscription_id = p_stripe_subscription_id;

    -- Update user tokens
    UPDATE user_tokens
    SET 
        is_subscribed = TRUE,
        monthly_tokens = v_monthly_tokens,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Trigger to auto-create user_tokens record for new users
CREATE OR REPLACE FUNCTION create_user_tokens_record()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_tokens (user_id, tokens_remaining, monthly_tokens, is_subscribed)
    VALUES (NEW.id, 100, 100, FALSE)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_user_created_create_tokens'
    ) THEN
        CREATE TRIGGER on_user_created_create_tokens
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION create_user_tokens_record();
    END IF;
END $$;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp trigger to all relevant tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'stripe_customers', 'subscriptions', 'payments', 
            'user_tokens'
        ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at();
        ', t, t, t, t);
    END LOOP;
END $$;

-- ============================================================================
-- 10. VIEWS FOR REPORTING
-- ============================================================================

-- View for user payment summary
CREATE OR REPLACE VIEW user_payment_summary AS
SELECT 
    u.id as user_id,
    u.email,
    ut.tokens_remaining,
    ut.tokens_used,
    ut.is_subscribed,
    ut.monthly_tokens,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'succeeded') as successful_payments,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'failed') as failed_payments,
    SUM(p.amount_cents) FILTER (WHERE p.status = 'succeeded') as total_spent_cents,
    MAX(p.created_at) FILTER (WHERE p.status = 'succeeded') as last_payment_date,
    s.status as subscription_status,
    s.current_period_end as subscription_end_date
FROM auth.users u
LEFT JOIN user_tokens ut ON ut.user_id = u.id
LEFT JOIN payments p ON p.user_id = u.id
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
GROUP BY u.id, u.email, ut.tokens_remaining, ut.tokens_used, ut.is_subscribed, 
         ut.monthly_tokens, s.status, s.current_period_end;

-- ============================================================================
-- COMPLETED MIGRATION
-- ============================================================================
-- This migration is now complete. All tables, functions, triggers, and views
-- have been created for a comprehensive Stripe payment system.
-- ============================================================================

