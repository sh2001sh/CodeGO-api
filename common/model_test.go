package common

import "testing"

func TestIsImageGenerationModelIncludesGPTImage2(t *testing.T) {
	if !IsImageGenerationModel("gpt-image-2") {
		t.Fatal("expected gpt-image-2 to be recognized as an image generation model")
	}
}
