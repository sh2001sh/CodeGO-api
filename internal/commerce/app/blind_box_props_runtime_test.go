package app

import (
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	"github.com/sh2001sh/new-api/constant"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"testing"
)

func TestActivateBlindBoxProp_AppliesConsumptionDiscount(t *testing.T) {
	db := setupRedemptionTestDB(t)

	user := &identityschema.User{
		Id:       8810,
		Username: "blind_box_prop_activation_user",
		Status:   constant.UserStatusEnabled,
	}
	require.NoError(t, db.Create(user).Error)

	var created *commerceschema.BlindBoxProp
	err := db.Transaction(func(tx *gorm.DB) error {
		var txErr error
		created, txErr = createBlindBoxPropTx(tx, user.Id, 1, "0.9 倍率卡")
		return txErr
	})
	require.NoError(t, err)
	require.NotNil(t, created)

	assert.Equal(t, 0.0, GetUserBlindBoxConsumptionDiscountRate(user.Id))

	activated, err := ActivateBlindBoxProp(user.Id, created.Id)
	require.NoError(t, err)
	require.NotNil(t, activated)
	assert.Equal(t, commerceschema.BlindBoxPropStatusActive, activated.Status)
	assert.NotZero(t, activated.ActivatedAt)
	assert.Greater(t, activated.ExpiresAt, activated.ActivatedAt)
	assert.InDelta(t, 0.10, activated.DiscountRate, 0.0001)
	assert.InDelta(t, 0.10, GetUserBlindBoxConsumptionDiscountRate(user.Id), 0.0001)

	props, err := ListUserBlindBoxProps(user.Id)
	require.NoError(t, err)
	require.Len(t, props, 1)
	assert.Equal(t, commerceschema.BlindBoxPropStatusActive, props[0].Status)
}
