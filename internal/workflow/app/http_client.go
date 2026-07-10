package app

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"

	platformconfig "github.com/sh2001sh/new-api/internal/platform/config"
	platformsecurity "github.com/sh2001sh/new-api/internal/platform/security"
	platformstore "github.com/sh2001sh/new-api/internal/platform/store"
	"golang.org/x/net/proxy"
)

var (
	workflowProxyClientLock sync.Mutex
	workflowProxyClients    = make(map[string]*http.Client)
)

func GetHttpClient() *http.Client {
	return http.DefaultClient
}

func GetHttpClientWithProxy(proxyURL string) (*http.Client, error) {
	if proxyURL == "" {
		return GetHttpClient(), nil
	}
	return newWorkflowProxyHTTPClient(proxyURL)
}

func workflowCheckRedirect(req *http.Request, via []*http.Request) error {
	fetchSetting := platformstore.GetFetchSetting()
	urlStr := req.URL.String()
	if err := platformsecurity.ValidateURLWithFetchSetting(urlStr, fetchSetting.EnableSSRFProtection, fetchSetting.AllowPrivateIp, fetchSetting.DomainFilterMode, fetchSetting.IpFilterMode, fetchSetting.DomainList, fetchSetting.IpList, fetchSetting.AllowedPorts, fetchSetting.ApplyIPFilterForDomain); err != nil {
		return fmt.Errorf("redirect to %s blocked: %v", urlStr, err)
	}
	if len(via) >= 10 {
		return fmt.Errorf("stopped after 10 redirects")
	}
	return nil
}

func newWorkflowProxyHTTPClient(proxyURL string) (*http.Client, error) {
	workflowProxyClientLock.Lock()
	if client, ok := workflowProxyClients[proxyURL]; ok {
		workflowProxyClientLock.Unlock()
		return client, nil
	}
	workflowProxyClientLock.Unlock()

	parsedURL, err := url.Parse(proxyURL)
	if err != nil {
		return nil, err
	}

	switch parsedURL.Scheme {
	case "http", "https":
		transport := &http.Transport{
			MaxIdleConns:        platformconfig.RelayMaxIdleConns,
			MaxIdleConnsPerHost: platformconfig.RelayMaxIdleConnsPerHost,
			ForceAttemptHTTP2:   true,
			Proxy:               http.ProxyURL(parsedURL),
		}
		if platformconfig.TLSInsecureSkipVerify {
			transport.TLSClientConfig = platformconfig.InsecureTLSConfig
		}
		client := &http.Client{
			Transport:     transport,
			CheckRedirect: workflowCheckRedirect,
			Timeout:       time.Duration(platformconfig.RelayTimeout) * time.Second,
		}
		workflowProxyClientLock.Lock()
		workflowProxyClients[proxyURL] = client
		workflowProxyClientLock.Unlock()
		return client, nil

	case "socks5", "socks5h":
		var auth *proxy.Auth
		if parsedURL.User != nil {
			auth = &proxy.Auth{
				User: parsedURL.User.Username(),
			}
			if password, ok := parsedURL.User.Password(); ok {
				auth.Password = password
			}
		}

		dialer, err := proxy.SOCKS5("tcp", parsedURL.Host, auth, proxy.Direct)
		if err != nil {
			return nil, err
		}

		transport := &http.Transport{
			MaxIdleConns:        platformconfig.RelayMaxIdleConns,
			MaxIdleConnsPerHost: platformconfig.RelayMaxIdleConnsPerHost,
			ForceAttemptHTTP2:   true,
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				return dialer.Dial(network, addr)
			},
		}
		if platformconfig.TLSInsecureSkipVerify {
			transport.TLSClientConfig = platformconfig.InsecureTLSConfig
		}

		client := &http.Client{
			Transport:     transport,
			CheckRedirect: workflowCheckRedirect,
			Timeout:       time.Duration(platformconfig.RelayTimeout) * time.Second,
		}
		workflowProxyClientLock.Lock()
		workflowProxyClients[proxyURL] = client
		workflowProxyClientLock.Unlock()
		return client, nil

	default:
		return nil, fmt.Errorf("unsupported proxy scheme: %s, must be http, https, socks5 or socks5h", parsedURL.Scheme)
	}
}
