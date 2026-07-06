package model

import (
	"fmt"
	"math/rand"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// Virtual user IDs for ghost group buy participation.
// Populated by InitGhostUsers / initGhostUsersDB at startup.
var ghostUserIds = []int{}

// InitGhostUsers ensures virtual users exist. Master-node only.
func InitGhostUsers() error {
	if !common.IsMasterNode {
		return nil
	}
	return initGhostUsersDB()
}

func initGhostUsersDB() error {
	usernames := []string{"ghost_user_1", "ghost_user_2", "ghost_user_3"}
	displayNames := []string{"用户****", "团友****", "会员****"}

	ids := make([]int, 0, len(usernames))
	for i, username := range usernames {
		var user User
		err := DB.Where("username = ?", username).First(&user).Error
		if err == nil {
			ids = append(ids, user.Id)
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return fmt.Errorf("failed to check ghost user %s: %w", username, err)
		}

		hashedPw, err := common.Password2Hash("ghost_user_password_" + username)
		if err != nil {
			return fmt.Errorf("failed to hash password for %s: %w", username, err)
		}

		newUser := User{
			Username:    username,
			Password:    hashedPw,
			DisplayName: displayNames[i%len(displayNames)],
			AffCode:     fmt.Sprintf("ghost%d", i+1),
			Role:        1,
			Status:      1,
			Group:       "ghost",
		}
		if err := DB.Create(&newUser).Error; err != nil {
			return fmt.Errorf("failed to create ghost user %s: %w", username, err)
		}
		ids = append(ids, newUser.Id)
		common.SysLog(fmt.Sprintf("created ghost user: id=%d username=%s", newUser.Id, username))
	}

	ghostUserIds = ids
	if len(ids) > 0 {
		common.SysLog(fmt.Sprintf("ghost users initialized: count=%d ids=%v", len(ids), ids))
	}
	return nil
}

// AddGhostMemberToNewOrder adds one ghost participant to a newly created group buy order.
// Called inside the same transaction that created the order.
// Errors are non-fatal: the real payment should not be blocked by ghost injection.
func AddGhostMemberToNewOrder(tx *gorm.DB, orderId int64) error {
	if len(ghostUserIds) == 0 {
		return nil
	}
	ghostUserId := ghostUserIds[rand.Intn(len(ghostUserIds))]

	member := GroupBuyMember{
		GroupBuyId:   orderId,
		UserId:       ghostUserId,
		OrderId:      0,    // marks as ghost
		BonusGranted: true, // skip bonus at settlement
	}
	if err := tx.Create(&member).Error; err != nil {
		return err
	}
	return tx.Model(&GroupBuyOrder{}).
		Where("id = ?", orderId).
		Updates(map[string]interface{}{
			"current_count": gorm.Expr("current_count + ?", 1),
			"updated_at":    common.GetTimestamp(),
		}).Error
}
