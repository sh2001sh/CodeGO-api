package common

import "testing"

func TestNormalizeFundingSourceOrder(t *testing.T) {
	tests := []struct {
		name     string
		order    []string
		pref     string
		expected []string
	}{
		{
			name:     "falls back to legacy preference when empty",
			order:    nil,
			pref:     "wallet_first",
			expected: []string{"blind_box", "wallet", "subscription"},
		},
		{
			name:     "keeps requested order with blind box moved last",
			order:    []string{"subscription", "wallet", "blind_box"},
			pref:     "subscription_first",
			expected: []string{"subscription", "wallet", "blind_box"},
		},
		{
			name:     "prepends blind box for old payloads",
			order:    []string{"wallet", "subscription"},
			pref:     "wallet_first",
			expected: []string{"blind_box", "wallet", "subscription"},
		},
		{
			name:     "supports wallet only mode",
			order:    []string{"blind_box", "wallet"},
			pref:     "wallet_only",
			expected: []string{"blind_box", "wallet"},
		},
		{
			name:     "rejects blind box only order",
			order:    []string{"blind_box"},
			pref:     "subscription_only",
			expected: []string{"blind_box", "subscription"},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			actual := NormalizeFundingSourceOrder(test.order, test.pref)
			if len(actual) != len(test.expected) {
				t.Fatalf("expected %v, got %v", test.expected, actual)
			}
			for index := range actual {
				if actual[index] != test.expected[index] {
					t.Fatalf("expected %v, got %v", test.expected, actual)
				}
			}
		})
	}
}

func TestBillingPreferenceFromFundingSourceOrder(t *testing.T) {
	tests := []struct {
		name     string
		order    []string
		expected string
	}{
		{
			name:     "projects subscription first order",
			order:    []string{"subscription", "blind_box", "wallet"},
			expected: "subscription_first",
		},
		{
			name:     "projects wallet first order",
			order:    []string{"blind_box", "wallet", "subscription"},
			expected: "wallet_first",
		},
		{
			name:     "projects subscription only order",
			order:    []string{"blind_box", "subscription"},
			expected: "subscription_only",
		},
		{
			name:     "projects wallet only order",
			order:    []string{"blind_box", "wallet"},
			expected: "wallet_only",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			actual := BillingPreferenceFromFundingSourceOrder(test.order)
			if actual != test.expected {
				t.Fatalf("expected %s, got %s", test.expected, actual)
			}
		})
	}
}
