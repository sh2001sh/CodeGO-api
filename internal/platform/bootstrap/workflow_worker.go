package bootstrap

import (
	platformconfig "github.com/sh2001sh/new-api/internal/platform/config"
	platformobservability "github.com/sh2001sh/new-api/internal/platform/observability"
	workflowtemporal "github.com/sh2001sh/new-api/internal/workflow/temporal"
)

func RunWorkflowWorker() {
	if err := prepareRuntime("workflow-worker"); err != nil {
		return
	}
	defer closeDatabase()

	cfg := workflowtemporal.LoadConfigFromEnv()
	if err := startWorkflowWorkerBackgroundTasks(); err != nil {
		platformobservability.FatalLog("failed to wire workflow runtime: " + err.Error())
		return
	}
	startDiagnostics()

	if !platformconfig.IsMasterNode {
		platformobservability.FatalLog("workflow-worker requires master node role")
		return
	}

	platformobservability.SysLog("workflow worker temporal runtime enabled")
	if err := workflowtemporal.RunWorker(cfg, workflowtemporal.NewDefaultWorkerDependencies()); err != nil {
		platformobservability.FatalLog("workflow-worker temporal bootstrap failed: " + err.Error())
	}
}

func startWorkflowWorkerBackgroundTasks() error {
	startOptionSyncLoop()
	return applyRuntimeWiring("workflow-worker")
}
