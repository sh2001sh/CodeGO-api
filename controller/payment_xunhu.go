package controller

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
)

const xunhuAPIVersion = "1.1"

type XunhuCreateOrderResponse struct {
	ErrCode   int    `json:"errcode"`
	ErrMsg    string `json:"errmsg"`
	TradeNo   string `json:"trade_order_id"`
	PayURL    string `json:"url"`
	QRCodeURL string `json:"url_qrcode"`
	Hash      string `json:"hash"`
}

func isXunhuPaymentMethod(method string) bool {
	trimmed := strings.TrimSpace(method)
	if trimmed == model.PaymentMethodXunhu {
		return true
	}
	return setting.XunhuEnabled && trimmed == "wxpay"
}

func buildXunhuHash(params map[string]string, secret string) string {
	keys := make([]string, 0, len(params))
	for key, value := range params {
		if key == "hash" || strings.TrimSpace(value) == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var builder strings.Builder
	for index, key := range keys {
		if index > 0 {
			builder.WriteByte('&')
		}
		builder.WriteString(key)
		builder.WriteByte('=')
		builder.WriteString(params[key])
	}
	builder.WriteString(secret)

	sum := md5.Sum([]byte(builder.String()))
	return hex.EncodeToString(sum[:])
}

func verifyXunhuHash(params map[string]string) bool {
	expected := buildXunhuHash(params, setting.XunhuSecret)
	return strings.EqualFold(expected, params["hash"])
}

func stringifyXunhuValue(value interface{}) (string, bool) {
	switch v := value.(type) {
	case nil:
		return "", false
	case string:
		return v, true
	case json.Number:
		return v.String(), true
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64), true
	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 32), true
	case int:
		return strconv.Itoa(v), true
	case int64:
		return strconv.FormatInt(v, 10), true
	case int32:
		return strconv.FormatInt(int64(v), 10), true
	case int16:
		return strconv.FormatInt(int64(v), 10), true
	case int8:
		return strconv.FormatInt(int64(v), 10), true
	case uint:
		return strconv.FormatUint(uint64(v), 10), true
	case uint64:
		return strconv.FormatUint(v, 10), true
	case uint32:
		return strconv.FormatUint(uint64(v), 10), true
	case uint16:
		return strconv.FormatUint(uint64(v), 10), true
	case uint8:
		return strconv.FormatUint(uint64(v), 10), true
	case bool:
		return strconv.FormatBool(v), true
	default:
		return "", false
	}
}

func buildXunhuResponseVerifyMap(payload map[string]interface{}) map[string]string {
	verifyMap := make(map[string]string, len(payload))
	for key, value := range payload {
		stringValue, ok := stringifyXunhuValue(value)
		if !ok {
			continue
		}
		verifyMap[key] = stringValue
	}
	return verifyMap
}

func validateXunhuConfig() error {
	switch {
	case strings.TrimSpace(setting.XunhuAppID) == "":
		return fmt.Errorf("xunhu app id is empty")
	case strings.TrimSpace(setting.XunhuSecret) == "":
		return fmt.Errorf("xunhu secret is empty")
	case strings.TrimSpace(setting.XunhuGateway) == "":
		return fmt.Errorf("xunhu gateway is empty")
	default:
		return nil
	}
}

func formatXunhuCreatePaymentError(err error) string {
	if err == nil {
		return "failed to create payment"
	}
	message := strings.TrimSpace(err.Error())
	if message == "" {
		return "failed to create payment"
	}
	message = strings.ReplaceAll(message, "\r", " ")
	message = strings.ReplaceAll(message, "\n", " ")
	message = strings.Join(strings.Fields(message), " ")
	if len(message) > 180 {
		message = message[:180] + "..."
	}
	return fmt.Sprintf("failed to create payment: %s", message)
}

func createXunhuOrder(tradeNo string, title string, totalFee float64, notifyURL string, returnURL string) (*XunhuCreateOrderResponse, error) {
	if err := validateXunhuConfig(); err != nil {
		return nil, err
	}
	nonce := common.GetRandomString(32)
	requestTime := strconv.FormatInt(time.Now().Unix(), 10)
	payload := map[string]string{
		"appid":          strings.TrimSpace(setting.XunhuAppID),
		"trade_order_id": tradeNo,
		"title":          title,
		"total_fee":      strconv.FormatFloat(totalFee, 'f', 2, 64),
		"notify_url":     notifyURL,
		"return_url":     returnURL,
		"time":           requestTime,
		"version":        xunhuAPIVersion,
		"nonce_str":      nonce,
	}
	payload["hash"] = buildXunhuHash(payload, setting.XunhuSecret)

	form := url.Values{}
	for key, value := range payload {
		form.Set(key, value)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest(http.MethodPost, strings.TrimSpace(setting.XunhuGateway), strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("xunhu create order failed, status=%d body=%s", resp.StatusCode, string(body))
	}

	var result XunhuCreateOrderResponse
	if err := common.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("invalid xunhu response: %s", string(body))
	}
	responsePayload := make(map[string]interface{})
	if err := common.Unmarshal(body, &responsePayload); err != nil {
		return nil, fmt.Errorf("invalid xunhu response payload: %s", string(body))
	}
	if result.ErrCode != 0 {
		errMsg := strings.TrimSpace(result.ErrMsg)
		if errMsg == "" {
			errMsg = string(body)
		}
		return nil, fmt.Errorf("xunhu create order failed: %s", errMsg)
	}
	if result.Hash != "" {
		responseVerify := buildXunhuResponseVerifyMap(responsePayload)
		responseVerify["hash"] = result.Hash
		if !verifyXunhuHash(responseVerify) {
			return nil, fmt.Errorf("xunhu response hash verification failed")
		}
	}
	if strings.TrimSpace(result.PayURL) == "" && strings.TrimSpace(result.QRCodeURL) == "" {
		return nil, fmt.Errorf("xunhu response missing payment url")
	}
	return &result, nil
}
