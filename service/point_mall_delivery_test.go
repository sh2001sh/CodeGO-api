package service

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
)

func TestJDCardSecretCount(t *testing.T) {
	cases := []struct {
		faceValue int64
		expected  int
	}{
		{faceValue: 5, expected: 1},
		{faceValue: 10, expected: 2},
		{faceValue: 20, expected: 1},
	}
	for _, testCase := range cases {
		count := jdCardSecretCount(model.PointMallProduct{FaceValue: testCase.faceValue})
		if count != testCase.expected {
			t.Fatalf("face value %d should require %d card secret(s), got %d", testCase.faceValue, testCase.expected, count)
		}
	}
}
