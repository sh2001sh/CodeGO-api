package app

import (
	"errors"
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	"strings"

	identitystore "github.com/sh2001sh/new-api/internal/identity/store"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
)

type TokenSnapshot struct {
	ID             int
	Key            string
	ExpiredTime    int64
	RemainQuota    int
	UsedQuota      int
	UnlimitedQuota bool
}

func GetTokenByKey(tokenKey string) (*TokenSnapshot, error) {
	token, err := identitystore.LoadTokenByKey(strings.TrimSpace(tokenKey), false)
	if err != nil {
		return nil, err
	}
	return tokenSnapshotFromModel(token), nil
}

func GetTokenByID(tokenID int) (*TokenSnapshot, error) {
	if tokenID <= 0 {
		return nil, errors.New("id 为空！")
	}
	token := &identityschema.Token{Id: tokenID}
	err := platformdb.DB.First(token, "id = ?", tokenID).Error
	if err != nil {
		return nil, err
	}
	return tokenSnapshotFromModel(token), nil
}

func GetUserUsedQuota(userID int) (int, error) {
	var quota int
	err := platformdb.DB.Model(&identityschema.User{}).Where("id = ?", userID).Select("used_quota").Find(&quota).Error
	return quota, err
}

func AdjustTokenQuota(tokenID int, tokenKey string, delta int) error {
	return identitystore.AdjustTokenQuota(tokenID, strings.TrimSpace(tokenKey), delta)
}

func tokenSnapshotFromModel(token *identityschema.Token) *TokenSnapshot {
	if token == nil {
		return nil
	}
	return &TokenSnapshot{
		ID:             token.Id,
		Key:            token.Key,
		ExpiredTime:    token.ExpiredTime,
		RemainQuota:    token.RemainQuota,
		UsedQuota:      token.UsedQuota,
		UnlimitedQuota: token.UnlimitedQuota,
	}
}
