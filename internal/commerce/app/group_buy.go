package app

// GroupBuyJoinRequest captures the payload used to join an existing group buy.
type GroupBuyJoinRequest struct {
	GroupBuyId int64 `json:"group_buy_id"`
	OrderId    int   `json:"order_id"`
}
