package store

import (
	gatewayschema "github.com/sh2001sh/new-api/internal/gateway/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
)

func LoadAllEnabledAbilitiesWithChannels() ([]gatewayschema.AbilityWithChannel, error) {
	var abilities []gatewayschema.AbilityWithChannel
	err := platformdb.DB.Table("abilities").
		Select("abilities.*, channels.type as channel_type").
		Joins("left join channels on abilities.channel_id = channels.id").
		Where("abilities.enabled = ?", true).
		Scan(&abilities).Error
	return abilities, err
}

func LoadGroupEnabledModels(group string) []string {
	var models []string
	platformdb.DB.Model(&gatewayschema.Ability{}).Where(&gatewayschema.Ability{Group: group, Enabled: true}).Distinct("model").Pluck("model", &models)
	return models
}

func LoadEnabledModels() []string {
	var models []string
	platformdb.DB.Model(&gatewayschema.Ability{}).Where(&gatewayschema.Ability{Enabled: true}).Distinct("model").Pluck("model", &models)
	return models
}
