package store

import (
	"testing"

	"github.com/glebarez/sqlite"
	gatewayschema "github.com/sh2001sh/new-api/internal/gateway/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestSaveRoutePool_ReplacesExistingMemberWithoutUniqueConflict(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(
		&gatewayschema.RoutePool{},
		&gatewayschema.RoutePoolMember{},
	))

	originalDB := platformdb.DB
	platformdb.DB = db
	t.Cleanup(func() {
		platformdb.DB = originalDB
		InvalidateRoutePoolCache()
	})

	pool := gatewayschema.RoutePool{Name: "default 自动路由", Group: "default", Enabled: true}
	_, err = SaveRoutePool(&pool, []gatewayschema.RoutePoolMember{{
		ChannelID:      42,
		CostMultiplier: 0.1,
		Enabled:        true,
	}})
	require.NoError(t, err)

	_, err = SaveRoutePool(&pool, []gatewayschema.RoutePoolMember{{
		ChannelID:      42,
		CostMultiplier: 0.2,
		Enabled:        false,
	}})
	require.NoError(t, err)

	var members []gatewayschema.RoutePoolMember
	require.NoError(t, db.Where("route_pool_id = ?", pool.ID).Find(&members).Error)
	require.Len(t, members, 1)
	require.Equal(t, 42, members[0].ChannelID)
	require.Equal(t, 0.2, members[0].CostMultiplier)
	require.False(t, members[0].Enabled)
}
