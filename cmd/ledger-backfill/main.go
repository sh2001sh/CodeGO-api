package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	billingdomain "github.com/sh2001sh/new-api/internal/billing/domain"
	billingschema "github.com/sh2001sh/new-api/internal/billing/schema"
	commerceapp "github.com/sh2001sh/new-api/internal/commerce/app"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	platformconfig "github.com/sh2001sh/new-api/internal/platform/config"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	platformstore "github.com/sh2001sh/new-api/internal/platform/store"
	"gorm.io/gorm"
)

type summary struct {
	WalletAccounts       int
	ClaudeWalletAccounts int
	TokenAccounts        int
	SubscriptionAccounts int
}

func main() {
	apply := flag.Bool("apply", false, "persist ledger accounts and bootstrap entries")
	limit := flag.Int("limit", 0, "optional maximum subjects per account type")
	flag.Parse()

	platformconfig.IsMasterNode = true
	if path := os.Getenv("SQLITE_PATH"); path != "" {
		platformdb.SQLitePath = path
	}
	if err := platformstore.InitPrimaryDB(); err != nil {
		log.Fatalf("initialize database: %v", err)
	}
	defer platformstore.CloseDatabases()
	if err := platformstore.ApplyV2Migrations(context.Background(), false); err != nil {
		log.Fatalf("apply v2 migrations: %v", err)
	}

	plan, err := inspect(*limit)
	if err != nil {
		log.Fatalf("inspect ledger backfill: %v", err)
	}
	fmt.Printf("wallet accounts to backfill: %d\n", plan.WalletAccounts)
	fmt.Printf("claude wallet accounts to backfill: %d\n", plan.ClaudeWalletAccounts)
	fmt.Printf("token accounts to backfill: %d\n", plan.TokenAccounts)
	fmt.Printf("subscription accounts to backfill: %d\n", plan.SubscriptionAccounts)
	if !*apply {
		fmt.Println("dry-run only; rerun with --apply to create missing ledger accounts")
		return
	}
	if err := applyBackfill(*limit); err != nil {
		log.Fatalf("apply ledger backfill: %v", err)
	}
	fmt.Println("ledger backfill completed")
}

func inspect(limit int) (summary, error) {
	var result summary
	if !platformdb.DB.Migrator().HasTable(&identityschema.User{}) {
		return result, nil
	}
	var users []identityschema.User
	query := platformdb.DB.Order("id asc")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&users).Error; err != nil {
		return result, err
	}
	for _, user := range users {
		if missingAccount("user", int64(user.Id), "wallet") {
			result.WalletAccounts++
		}
		if missingAccount("user", int64(user.Id), "claude_wallet") {
			result.ClaudeWalletAccounts++
		}
	}
	if platformdb.DB.Migrator().HasTable(&identityschema.Token{}) {
		var tokens []identityschema.Token
		tokenQuery := platformdb.DB.Order("id asc")
		if limit > 0 {
			tokenQuery = tokenQuery.Limit(limit)
		}
		if err := tokenQuery.Find(&tokens).Error; err != nil {
			return result, err
		}
		for _, token := range tokens {
			if !token.UnlimitedQuota && missingAccount("token", int64(token.Id), "token") {
				result.TokenAccounts++
			}
		}
	}

	if !platformdb.DB.Migrator().HasTable(&commerceschema.UserSubscription{}) {
		return result, nil
	}
	var subscriptions []commerceschema.UserSubscription
	subscriptionQuery := platformdb.DB.Order("id asc")
	if limit > 0 {
		subscriptionQuery = subscriptionQuery.Limit(limit)
	}
	if err := subscriptionQuery.Find(&subscriptions).Error; err != nil {
		return result, err
	}
	for _, subscription := range subscriptions {
		if missingAccount("user_subscription", int64(subscription.Id), "subscription") {
			result.SubscriptionAccounts++
		}
	}
	return result, nil
}

func missingAccount(ownerType string, ownerID int64, accountType string) bool {
	var count int64
	if err := platformdb.DB.Model(&billingschema.BillingAccount{}).
		Where("owner_type = ? AND owner_id = ? AND account_type = ? AND quota_unit = ?", ownerType, ownerID, accountType, "quota").
		Count(&count).Error; err != nil {
		log.Fatalf("inspect account owner_type=%s owner_id=%d: %v", ownerType, ownerID, err)
	}
	return count == 0
}

func applyBackfill(limit int) error {
	if !platformdb.DB.Migrator().HasTable(&identityschema.User{}) {
		return nil
	}
	return platformdb.DB.Transaction(func(tx *gorm.DB) error {
		if err := backfillUsers(tx, limit); err != nil {
			return err
		}
		if err := backfillTokens(tx, limit); err != nil {
			return err
		}
		if err := commerceapp.MigrateBlindBoxLegacyCreditsTx(tx); err != nil {
			return err
		}
		if !tx.Migrator().HasTable(&commerceschema.UserSubscription{}) {
			return nil
		}
		return backfillSubscriptions(tx, limit)
	})
}

func backfillTokens(tx *gorm.DB, limit int) error {
	if !tx.Migrator().HasTable(&identityschema.Token{}) {
		return nil
	}
	var tokens []identityschema.Token
	query := tx.Order("id asc")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&tokens).Error; err != nil {
		return err
	}
	for _, token := range tokens {
		if token.UnlimitedQuota {
			continue
		}
		if err := ensureBootstrapCredit(tx, "token", "token", int64(token.Id), int64(token.RemainQuota), fmt.Sprintf("ledger-backfill:token:%d", token.Id)); err != nil {
			return err
		}
	}
	return nil
}

func backfillUsers(tx *gorm.DB, limit int) error {
	var users []identityschema.User
	query := tx.Order("id asc")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&users).Error; err != nil {
		return err
	}
	for _, user := range users {
		if err := ensureBootstrapCredit(tx, "wallet", "user", int64(user.Id), int64(user.Quota), fmt.Sprintf("ledger-backfill:user:%d:wallet", user.Id)); err != nil {
			return err
		}
		if err := ensureBootstrapCredit(tx, "claude_wallet", "user", int64(user.Id), int64(user.ClaudeQuota), fmt.Sprintf("ledger-backfill:user:%d:claude_wallet", user.Id)); err != nil {
			return err
		}
	}
	return nil
}

func backfillSubscriptions(tx *gorm.DB, limit int) error {
	var subscriptions []commerceschema.UserSubscription
	query := tx.Order("id asc")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Find(&subscriptions).Error; err != nil {
		return err
	}
	for _, subscription := range subscriptions {
		available := subscription.AmountTotal - subscription.AmountUsed
		if available < 0 {
			available = 0
		}
		if err := ensureBootstrapCredit(tx, "subscription", "user_subscription", int64(subscription.Id), available, fmt.Sprintf("ledger-backfill:subscription:%d", subscription.Id)); err != nil {
			return err
		}
	}
	return nil
}

func ensureBootstrapCredit(tx *gorm.DB, accountType string, ownerType string, ownerID int64, amount int64, idempotencyKey string) error {
	account, err := billingdomain.EnsureBillingAccountTx(tx, billingdomain.EnsureAccountParams{AccountType: accountType, OwnerType: ownerType, OwnerID: ownerID, QuotaUnit: "quota"})
	if err != nil {
		return err
	}
	var entryCount int64
	if err := tx.Model(&billingschema.BillingLedgerEntry{}).Where("account_id = ?", account.AccountID).Count(&entryCount).Error; err != nil {
		return err
	}
	if entryCount > 0 || amount == 0 {
		return nil
	}
	_, err = billingdomain.CreditAccountTx(tx, billingdomain.CreditAccountParams{
		AccountID: account.AccountID, Amount: amount, IdempotencyKey: idempotencyKey,
		ReasonCode: "legacy_balance_backfill", ReferenceType: ownerType, ReferenceID: fmt.Sprintf("%d", ownerID), OperatorType: "migration",
	})
	return err
}
