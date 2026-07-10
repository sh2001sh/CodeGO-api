package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	auditprojection "github.com/sh2001sh/new-api/internal/audit/projection"
	platformconfig "github.com/sh2001sh/new-api/internal/platform/config"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	platformstore "github.com/sh2001sh/new-api/internal/platform/store"
)

func main() {
	dryRun := flag.Bool("dry-run", false, "report pending v2 migrations without applying them")
	flag.Parse()

	platformconfig.IsMasterNode = true
	if path := os.Getenv("SQLITE_PATH"); path != "" {
		platformdb.SQLitePath = path
	}
	if err := platformstore.InitPrimaryDB(); err != nil {
		panic(fmt.Errorf("initialize primary database: %w", err))
	}
	defer platformstore.CloseDatabases()
	if err := platformstore.ApplyV2Migrations(context.Background(), *dryRun); err != nil {
		panic(err)
	}
	if !*dryRun {
		if err := auditprojection.ApplyReadModelMigrations(context.Background()); err != nil {
			panic(err)
		}
	}
}
