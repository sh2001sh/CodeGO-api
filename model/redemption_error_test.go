package model

import (
	"errors"
	"testing"
)

func TestRedemptionErrorAliases(t *testing.T) {
	if !errors.Is(ErrRedeemFailed, ErrRedemptionBusy) {
		t.Fatalf("ErrRedeemFailed should alias ErrRedemptionBusy")
	}
	if errors.Is(ErrRedemptionInvalid, ErrRedemptionBusy) {
		t.Fatalf("invalid should not alias busy")
	}
	if errors.Is(ErrRedemptionUsed, ErrRedemptionExpired) {
		t.Fatalf("used should not alias expired")
	}
}
