const express = require('express');
const app = express();
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const assert = require('assert');
const cors = require('cors')

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 600000 }, resave: false, saveUninitialized: false}));
app.use(cors())

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: 'SocialNetwork'
});
  
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected to DB!");
});

app.get('/getProfile', (req, res) => {
    if (!req.session.uid) {
        res.status(500).send({
            body: 'Session expired',
            reason: 'SESSION_EXPIRED'
        })
    } else {
        let sql = "select email, gender, country, state, city, address from Users where uid = ?";
        con.query(sql, [req.session.uid], (err, sqlResult) => {
            if (err) {
                res.status(500).send({
                    body: 'Internal server error',
                    reason: 'SERVER_ERROR',
                })
            } else if (sqlResult.length == 0) {
                res.status(500).send({
                    body: 'Invalid user',
                    reason: 'INVALID_USER',
                })
            } else if (sqlResult.length == 1) {
                res.status(200).send({
                    body: sqlResult[0]
                })
            } else {
                new assert.AssertionError('Unique field cannot have 2 rows with same value');
            }
        })
    }
})

app.post('/updateProfile', (req, res) => {
    if (!req.session.uid) {
        res.status(500).send({
            body: 'Session expired',
            reason: 'SESSION_EXPIRED'
        })
    } else {
        let uid = req.session.uid;
        let email = req.body.email;
        let password = req.body.password;
        let gender = req.body.gender;
        let country = req.body.country;
        let state = req.body.state;
        let city = req.body.city;
        let address = req.body.address;
        let sql = "update Users set email = ?, password = ?, gender = ? , country = ? , state = ? , city = ? , address = ? where uid = ?";
        let vars = [email, password, gender, country, state, city, address, uid]
        con.query(sql, vars, (err, sqlResult) => {
            if (err) {
                console.error(err)
                res.status(500).send({
                    body: 'Couldn`t proceed with request',
                    reason: 'SERVER_ERROR'
                })
            } else {
                res.status(200).send({
                    body: 'success'
                })
            }
        })
    }
})

app.post('/register', (req, res) => {
    let sql = "insert into Users(email, password, gender, country, state, city, address) values(?, ?, ?, ?, ?, ?, ?)";
    let vars = [req.body.email, req.body.password, req.body.gender, req.body.country, req.body.state, req.body.city, req.body.address];
    if (!isEmailValid(req.body.email)) {
        res.status(500).end({
            body: 'Invalid Email',
            reason: 'INVALID_EMAIL'
        });
        return;
    }
    con.query(sql, vars, function (err, result) {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(500).send({
                    body: 'Couldn`t proceed with request',
                    reason: 'USER_TAKEN'
                })
            } else {
                console.error(err)
                res.status(500).send({
                    body: 'Couldn`t proceed with request',
                    reason: 'SERVER_ERROR'
                })
            }
        } else {
            res.status(200).send({
                body: 'success'
            })
        }
    });
})

app.post('/login', (req, res) => {
    let sql = "select UID, email, password from Users where email = ? and password = ?";
    let vars = [req.body.email, req.body.password];
    con.query(sql, vars, (err, sqlResult) => {
        if (err) {
            console.error(err)
            res.status(500).send({
                body: 'Couldn`t proceed with request',
                reason: 'SERVER_ERROR'
            })
        } else {
            if (sqlResult.length == 0) {
                res.status(500).send({
                    body: 'Invalid username and/or password',
                    reason: 'INVALID_USER',
                })
            } else if (sqlResult.length == 1) {
                req.session.uid = sqlResult[0].UID
                res.status(200).send({
                    body: 'success',
                    userId: req.session.uid
                })
            } else {
                new assert.AssertionError('Unique field cannot have 2 rows with same value');
            }
        }
    })
})

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (!err) {
            res.status(200).end({
                body: 'success'
            })
        } else {
            console.error(err)
            res.status(500).end({
                body: 'Cannot logout',
                reason: 'SERVER_ERROR'
            })
        }
    })
})

function isEmailValid(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

app.listen(4000)