-- ============================================================
-- Volunteering Platform — PostgreSQL Schema
-- preliminarily generated for testing
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- Admins and volunteers. is_admin distinguishes coordinators.
-- status: 'invited' | 'active' | 'inactive'
-- ============================================================
CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT NOT NULL,
    phone                   TEXT NOT NULL UNIQUE,
    email                   TEXT UNIQUE,
    status                  TEXT NOT NULL DEFAULT 'invited'
                                CHECK (status IN ('invited', 'active', 'inactive')),
    is_admin                BOOLEAN NOT NULL DEFAULT FALSE,
    magic_link_token        TEXT UNIQUE,
    magic_link_expires_at   TIMESTAMPTZ,
    last_sms_sent_at        TIMESTAMPTZ,
    total_hours_volunteered NUMERIC(8, 2) NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROLES (qualifications / positions)
-- e.g. Kitchen, Greeter, Driver
-- ============================================================
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER_ROLES
-- Which roles/qualifications each user holds
-- ============================================================
CREATE TABLE user_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

-- ============================================================
-- AVAILABILITY_RECURRING
-- Weekly repeating availability windows per user
-- day_of_week: 0 = Sunday ... 6 = Saturday
-- ============================================================
CREATE TABLE availability_recurring (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- ============================================================
-- AVAILABILITY_OVERRIDES
-- One-off dates where user overrides their recurring window
-- is_available=false means they're blocking that date out
-- ============================================================
CREATE TABLE availability_overrides (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    override_date DATE NOT NULL,
    is_available  BOOLEAN NOT NULL DEFAULT TRUE,
    start_time    TIME,
    end_time      TIME,
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, override_date)
);

-- ============================================================
-- SHIFTS
-- A shift represents one event occurrence (or template for recurring).
-- parent_shift_id links recurring instances back to their template.
-- recurrence_rule stores an iCal RRULE string for recurring shifts.
-- status: 'draft' | 'open' | 'filled' | 'cancelled'
-- ============================================================
CREATE TABLE shifts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT NOT NULL,
    shift_date       DATE NOT NULL,
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    is_recurring     BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule  TEXT,          -- RRULE string e.g. FREQ=WEEKLY;BYDAY=MO
    parent_shift_id  UUID REFERENCES shifts(id) ON DELETE SET NULL,
    status           TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('draft', 'open', 'filled', 'cancelled')),
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- ============================================================
-- SHIFT_POSITIONS
-- Each shift has one or more positions (role + headcount).
-- e.g. Kitchen x2, Greeter x2
-- slots_filled is maintained by trigger or app logic.
-- ============================================================
CREATE TABLE shift_positions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id     UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    role_id      UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    slots_total  SMALLINT NOT NULL DEFAULT 1 CHECK (slots_total > 0),
    slots_filled SMALLINT NOT NULL DEFAULT 0 CHECK (slots_filled >= 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (slots_filled <= slots_total)
);

-- ============================================================
-- SHIFT_ASSIGNMENTS
-- A user assigned to a specific position slot on a shift.
-- status: 'pending' | 'confirmed' | 'cancelled'
-- ============================================================
CREATE TABLE shift_assignments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_position_id   UUID NOT NULL REFERENCES shift_positions(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              TEXT NOT NULL DEFAULT 'confirmed'
                            CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    cancellation_reason TEXT,
    UNIQUE (shift_position_id, user_id)
);

-- ============================================================
-- COVER_REQUESTS
-- Created when a shift assignment is cancelled and coverage is needed.
-- status: 'searching' | 'filled' | 'exhausted'
-- timer_expires_at drives the 1hr / 15min urgency logic.
-- ============================================================
CREATE TABLE cover_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_assignment_id UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
    status              TEXT NOT NULL DEFAULT 'searching'
                            CHECK (status IN ('searching', 'filled', 'exhausted')),
    batch_number        SMALLINT NOT NULL DEFAULT 1,
    timer_expires_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ
);

-- ============================================================
-- COVER_OUTREACH
-- Individual SMS offers sent as part of a cover request batch.
-- status: 'sent' | 'accepted' | 'declined' | 'expired'
-- rank_in_batch controls the priority ordering within a batch.
-- ============================================================
CREATE TABLE cover_outreach (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cover_request_id UUID NOT NULL REFERENCES cover_requests(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank_in_batch    SMALLINT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'sent'
                         CHECK (status IN ('sent', 'accepted', 'declined', 'expired')),
    sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at     TIMESTAMPTZ,
    UNIQUE (cover_request_id, user_id)
);

-- ============================================================
-- SMS_LOG
-- Audit trail for all outbound SMS messages.
-- message_type: 'invite' | 'shift_offer' | 'confirmation' |
--               'reminder' | 'cancellation' | 'cover_filled'
-- ============================================================
CREATE TABLE sms_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type TEXT NOT NULL,
    body         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'sent'
                     CHECK (status IN ('sent', 'delivered', 'failed')),
    twilio_sid   TEXT,
    sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_user_roles_user       ON user_roles(user_id);
CREATE INDEX idx_user_roles_role       ON user_roles(role_id);
CREATE INDEX idx_avail_recurring_user  ON availability_recurring(user_id);
CREATE INDEX idx_avail_overrides_user  ON availability_overrides(user_id);
CREATE INDEX idx_avail_overrides_date  ON availability_overrides(override_date);
CREATE INDEX idx_shifts_date           ON shifts(shift_date);
CREATE INDEX idx_shifts_status         ON shifts(status);
CREATE INDEX idx_shift_positions_shift ON shift_positions(shift_id);
CREATE INDEX idx_assignments_user      ON shift_assignments(user_id);
CREATE INDEX idx_assignments_position  ON shift_assignments(shift_position_id);
CREATE INDEX idx_assignments_status    ON shift_assignments(status);
CREATE INDEX idx_cover_requests_status ON cover_requests(status);
CREATE INDEX idx_cover_outreach_user   ON cover_outreach(user_id);
CREATE INDEX idx_sms_log_user          ON sms_log(user_id);
CREATE INDEX idx_sms_log_sent_at       ON sms_log(sent_at);