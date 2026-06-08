package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func conversationArchiveWritePath(path string, incomingSize int64) (string, error) {
	for index := 0; ; index++ {
		candidate := conversationArchiveSegmentPath(path, index)
		info, err := os.Stat(candidate)
		if err != nil {
			if os.IsNotExist(err) {
				return candidate, nil
			}
			return "", err
		}
		if incomingSize > conversationArchiveMaxSize || info.Size()+incomingSize <= conversationArchiveMaxSize {
			return candidate, nil
		}
	}
}

func conversationArchiveSegmentPath(path string, index int) string {
	if index == 0 {
		return path
	}
	ext := filepath.Ext(path)
	base := strings.TrimSuffix(path, ext)
	return fmt.Sprintf("%s_%04d%s", base, index, ext)
}
