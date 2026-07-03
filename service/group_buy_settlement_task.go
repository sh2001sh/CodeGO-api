package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/bytedance/gopkg/util/gopool"
)

const (
	groupBuySettlementTickInterval = 1 * time.Minute
	groupBuySettlementBatchSize    = 100
)

var (
	groupBuySettlementOnce    sync.Once
	groupBuySettlementRunning atomic.Bool
)

func StartGroupBuySettlementTask() {
	groupBuySettlementOnce.Do(func() {
		if !common.IsMasterNode {
			return
		}
		gopool.Go(func() {
			logger.LogInfo(context.Background(), fmt.Sprintf("group buy settlement task started: tick=%s", groupBuySettlementTickInterval))
			ticker := time.NewTicker(groupBuySettlementTickInterval)
			defer ticker.Stop()

			runGroupBuySettlementOnce()
			for range ticker.C {
				runGroupBuySettlementOnce()
			}
		})
	})
}

func runGroupBuySettlementOnce() {
	if !groupBuySettlementRunning.CompareAndSwap(false, true) {
		return
	}
	defer groupBuySettlementRunning.Store(false)

	ctx := context.Background()
	totalSettled := 0
	for {
		n, err := model.SettleDueGroupBuys(groupBuySettlementBatchSize)
		if err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("group buy settlement task failed: %v", err))
			return
		}
		if n == 0 {
			break
		}
		totalSettled += n
		if n < groupBuySettlementBatchSize {
			break
		}
	}
	if common.DebugEnabled && totalSettled > 0 {
		logger.LogDebug(ctx, "group buy settlement: settled_count=%d", totalSettled)
	}
}
