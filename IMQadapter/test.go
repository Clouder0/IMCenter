package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"

	"github.com/tencentyun/cos-go-sdk-v5"
)

type Peer struct {
	Uid      string `json:"uid"`
	Name     string `json:"name"`
	ChatType string `json:"chatType"`
}

type Element struct {
	Type    string `json:"type"`
	Content string `json:"content"`
	File    string `json:"file"`
}

type Sender struct {
	MemberName string `json:"memberName"`
	NickName   string `json:"nickName"`
}

type QQMessage struct {
	Peer     Peer      `json:"peer"`
	Sender   Sender    `json:"sender"`
	Elements []Element `json:"elements"`
}

var cosClient *cos.Client
var backendUrl string
var filterKeywords []string

func uploadImage(path string) (string, error) {
	id := uuid.New().String()
	ext := filepath.Ext(path)
	res, _, err := cosClient.Object.Upload(context.Background(), "imc_imgs/"+id+ext, path, nil)
	if err != nil {
		return "", err
	}
	fmt.Println(res.Location)
	fmt.Println(res.Key)
	return res.Location + res.Key, nil
}

func handleQQMsg(c *gin.Context) {
	var msg QQMessage
	bindErr := c.ShouldBindJSON(&msg)
	if bindErr != nil {
		fmt.Println(bindErr)
	}
	groupName := msg.Peer.Name
	hasKeyword := false
	for _, v := range filterKeywords {
		if strings.Contains(groupName, v) {
			hasKeyword = true
			break
		}
	}
	if !hasKeyword {
		return
	}
	senderName := msg.Sender.NickName
	content := ""
	for _, e := range msg.Elements {
		if e.Type == "text" {
			content += "<p>" + e.Content + "</p>"
		} else if e.Type == "image" {
			fmt.Println(e.File)
			res, err := uploadImage(e.File)
			if err != nil {
				fmt.Println(err)
			} else {
				content += "<img src=\"" + res + "\" />"
			}
		}
	}
	if content == "" {
		return
	}
	fmt.Println(msg.Peer)
	data, err := json.Marshal(gin.H{
		"source_group_name": groupName,
		"sender_name":       senderName,
		"content":           content,
		"source_type":       "QQ",
		"processed":         false,
	})
	fmt.Println(data)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(backendUrl)
	http.Post(backendUrl, "application/json", bytes.NewBuffer(data))
	c.String(200, fmt.Sprintf("%#v", msg))
}

func main() {
	err := godotenv.Load()
	if err != nil {
		fmt.Println(err)
	}
	backendUrl = os.Getenv("BACKENDURL")
	bucketUrl, _ := url.Parse(os.Getenv("BUCKETURL"))
	filterKeywords = strings.Split(os.Getenv("FILTERKEYWORDS"), "|")
	base := &cos.BaseURL{
		BucketURL: bucketUrl,
	}
	cosClient = cos.NewClient(base, &http.Client{
		Transport: &cos.AuthorizationTransport{
			SecretID:  os.Getenv("SECRETID"),  // 用户的 SecretId，建议使用子账号密钥，授权遵循最小权限指引，降低使用风险。子账号密钥获取可参考 https://cloud.tencent.com/document/product/598/37140
			SecretKey: os.Getenv("SECRETKEY"), // 用户的 SecretKey，建议使用子账号密钥，授权遵循最小权限指引，降低使用风险。子账号密钥获取可参考 https://cloud.tencent.com/document/product/598/37140
		},
	})
	fmt.Println("hello world")
	r := gin.Default()
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})
	r.POST("/qqmessage", handleQQMsg)
	r.Run("0.0.0.0:3002")
}
