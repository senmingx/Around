package main

import (
	elastic "gopkg.in/olivere/elastic.v3"

	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"time"

	"github.com/dgrijalva/jwt-go"
)

const (
	TYPE_USER = "user"
)

type User struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// check whether user is valid, check whether a pair of username and password is
// stored in ES
func checkUser(username, password string) bool {
	es_client,err := elastic.NewClient(elastic.SetURL(ES_URL), elastic.SetSniff(false))
	if err != nil {
		fmt.Printf("ES is not setup %v\n", err)
		return false
	}

	// set a term query
	termQuery := elastic.NewTermQuery("username", username)
	// search
	queryResult,err := es_client.Search().
		Index(INDEX).
		Query(termQuery).
		Pretty(true).
		Do()
	if err != nil {
		fmt.Printf("ES query failed %v\n", err)
		return false
	}

	var tyu User
	for _,item := range queryResult.Each(reflect.TypeOf(tyu)) {
		// if queryResult found the user, check if username and psw matched
		u := item.(User)
		return u.Password == password && u.Username == username
	}
	// if no user exist, return false
	return false
}

// add a new user, return true if success
func addUser(username, password string) bool {
	es_client,err := elastic.NewClient(elastic.SetURL(ES_URL), elastic.SetSniff(false))
	if err != nil {
		fmt.Printf("ES is not setip %v\n", err)
		return false
	}

	user := &User {
		Username: username,
		Password: password,
	}

	// set a term query
	termQuery := elastic.NewTermQuery("username", username)
	// search
	queryResult, err := es_client.Search().
		Index(INDEX).
		Query(termQuery).
		Pretty(true).
		Do()
	if err != nil {
		fmt.Printf("ES query failed %v\n", err)
		return false
	}
	// if has result, then user exists
	if queryResult.TotalHits() > 0 {
		fmt.Printf("User %s already exists, cannot create duplicate user.\n", username)
		return false
	}

	// save it to index
	_,err = es_client.Index().
		Index(INDEX).
		Type(TYPE_USER).
		Id(username).
		BodyJson(user).
		Refresh(true).
		Do()
	if err != nil {
		fmt.Printf("ES save failed %v\n", err)
		return false
	}
	return true
}

// if signup is successful, a new session is created
func signupHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Received one signup request")

	// decode a user from request (POST)
	decoder := json.NewDecoder(r.Body)
	var u User
	if err := decoder.Decode(&u); err != nil {
		panic(err)
		return
	}

	// check whether username and password are empty, if any of them is empty, call
	// http.Error
	if u.Username != "" && u.Password != "" {
		// if not empty, call addUser, if succeed, return a message,
		// else call http.Error
		if addUser(u.Username, u.Password) {
			fmt.Println("User added successfully.")
			w.Write([]byte("User added successfully."))
		} else {
			fmt.Println("Failed to add a new user.")
			http.Error(w, "Failed to add a new user", http.StatusInternalServerError)
		}
	} else {
		fmt.Println("Empty password or username.")
		http.Error(w, "Empty password or username", http.StatusInternalServerError)
	}

	// set headers
	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Access-Control-Allow-Origin", "*")
}

// if login is successful, a new token is created
func loginHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Received one login request")

	decoder := json.NewDecoder(r.Body)
	var u User
	if err := decoder.Decode(&u); err != nil {
		panic(err)
		return
	}

	// if username and password matches, create a token
	if checkUser(u.Username, u.Password) {
		// create a new token object to store
		token := jwt.New(jwt.SigningMethodHS256)
		// convert it into a map for lookup
		claims := token.Claims.(jwt.MapClaims)

		// set token claims
		claims["username"] = u.Username
		// expire time to be 24 hours from now
		claims["exp"] = time.Now().Add(time.Hour * 24).Unix()

		// sign the token with our secret such that only server knows it
		tokenString,_ := token.SignedString(mySigningKey)
		// write the token to the browser window
		w.Write([]byte(tokenString))
	} else {
		fmt.Println("Invalid password or username.")
		http.Error(w, "Invalid password or username", http.StatusForbidden)
	}

	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("Access-Control-Allow-Origin", "*")
}

